import {
    Keyset,
    NutError,
    NutInfo,
    TokenMelt,
    TokenMint,
    TokenSwap,
    TokenStateCheck,
    TokenSignatureRestore
} from "tsnut";
import * as express from "express";
import * as cors from "cors";
import {Express} from "express";

const serviceWrapper = (check: (req: any) => boolean, execute: (req: any) => Promise<any>) => {
    return async (req, res) => {
        if(!check(req.body)) {
            res.status(400).json({
                detail: "Invalid request params",
                code: 100
            });
            return;
        }
        try {
            res.json(await execute(req.body));
        } catch (e) {
            if(e instanceof NutError) {
                res.status(400).json(e);
            } else {
                console.error(e);
                res.status(400).json({
                    detail: "Internal server error",
                    code: 200
                });
            }
        }
    };
}

export class TsnutHttpServer {

    keysets: Keyset<any>[];
    tokenSwap: TokenSwap;
    tokenMints: TokenMint<any, any, any>[];
    tokenMelts: TokenMelt<any, any, any, any, any>[];
    tokenCheck: TokenStateCheck;
    signatureRestore: TokenSignatureRestore;
    nutInfo: NutInfo;

    server: Express;

    constructor(
        keysets: Keyset<any>[],
        tokenSwap: TokenSwap,
        tokenMints: TokenMint<any, any, any>[],
        tokenMelts: TokenMelt<any, any, any, any, any>[],
        tokenCheck: TokenStateCheck,
        signatureRestore: TokenSignatureRestore,
        nutInfo: NutInfo
    ) {
        this.keysets = keysets;
        this.tokenSwap = tokenSwap;
        this.tokenMints = tokenMints;
        this.tokenMelts = tokenMelts;
        this.tokenCheck = tokenCheck;
        this.signatureRestore = signatureRestore;
        this.nutInfo = nutInfo;
    }

    async start(host: string, port: number): Promise<void> {
        this.server = express();
        this.server.use(cors());
        this.server.use(express.json());

        this.server.use((req, res, next) => {
            console.log('Request '+req.method+" "+req.url+": ",req.body);
            const oldJson = res.json.bind(res);
            res.json = (obj: any) => {
                oldJson(obj);
                console.log('Response '+req.url+": ", obj);
                return res;
            };
            next();
        });

        this.server.use((req, res, next) => {
            if(req.url.startsWith("/v1")) req.url = req.url.substring(3);
            next();
        });

        //Nut01
        this.server.get('/keys', (req, res) => {
            res.json({
                keysets: this.keysets.filter(keyset => keyset.active).map(keyset => keyset.getKeysetResponse())
            });
        });

        //Nut02
        this.server.get('/keysets', (req, res) => {
            res.json({
                keysets: this.keysets.map(keyset => keyset.getKeysetSummaryResponse())
            });
        });
        this.server.get('/keys/:keysetId', (req, res) => {
            const keysetId: string = req.params.keysetId;
            if(keysetId.length!=32) {
                res.status(400).json({
                    detail: "Invalid request params",
                    code: 100
                });
                return;
            }
            const keyset = this.keysets.find(keyset => keyset.getId()===keysetId);
            if(keyset==null) {
                res.status(400).json({
                    detail: "Keyset not found",
                    code: 101
                });
                return;
            }
            res.json({
                keysets: [keyset.getKeysetResponse()]
            });
        });

        //Nut03
        if(this.tokenSwap!=null) {
            this.server.post('/swap', serviceWrapper(this.tokenSwap.checkSwapRequest.bind(this.tokenSwap), this.tokenSwap.swap.bind(this.tokenSwap)));
        }

        //Nut04
        if(this.tokenMints!=null) {
            for(let tokenMint of this.tokenMints) {
                this.server.post('/mint/quote/'+tokenMint.getMethod(), serviceWrapper(tokenMint.checkMintQuoteRequest.bind(tokenMint), tokenMint.mintQuote.bind(tokenMint)));
                this.server.get('/mint/quote/'+tokenMint.getMethod()+"/:quoteId", async (req, res) => {
                    const quoteId: string = req.params.quoteId;
                    if(quoteId.length!=64) {
                        res.status(400).json({
                            detail: "Invalid request params",
                            code: 100
                        });
                        return;
                    }
                    try {
                        res.json(await tokenMint.getQuote(quoteId));
                    } catch (e) {
                        if(e instanceof NutError) {
                            res.status(400).json(e);
                        } else {
                            console.error(e);
                            res.status(400).json({
                                detail: "Internal server error",
                                code: 200
                            });
                        }
                    }
                });
                this.server.post('/mint/'+tokenMint.getMethod(), serviceWrapper(tokenMint.checkMintRequest.bind(tokenMint), tokenMint.mint.bind(tokenMint)));
            }
        }

        //Nut05
        if(this.tokenMelts!=null) {
            for(let tokenMelt of this.tokenMelts) {
                this.server.post('/melt/quote/'+tokenMelt.getMethod(), serviceWrapper(tokenMelt.checkMeltQuoteRequest.bind(tokenMelt), tokenMelt.meltQuote.bind(tokenMelt)));
                this.server.get('/melt/quote/'+tokenMelt.getMethod()+"/:quoteId", async (req, res) => {
                    const quoteId: string = req.params.quoteId;
                    if(quoteId.length!=64) {
                        res.status(400).json({
                            detail: "Invalid request params",
                            code: 100
                        });
                        return;
                    }
                    try {
                        res.json(await tokenMelt.getQuote(quoteId));
                    } catch (e) {
                        if(e instanceof NutError) {
                            res.status(400).json(e);
                        } else {
                            console.error(e);
                            res.status(400).json({
                                detail: "Internal server error",
                                code: 200
                            });
                        }
                    }
                });
                this.server.post('/melt/'+tokenMelt.getMethod(), serviceWrapper(tokenMelt.checkMeltRequest.bind(tokenMelt), tokenMelt.melt.bind(tokenMelt)));
            }
        }

        //Nut06
        this.server.get('/info', (req, res) => {
            res.json(this.nutInfo.getResponse());
        });

        //Nut07
        if(this.tokenCheck!=null) {
            this.server.post('/checkstate', serviceWrapper(this.tokenCheck.checkRequest.bind(this.tokenSwap), this.tokenCheck.checkTokens.bind(this.tokenCheck)));
        }

        //Nut09
        if(this.signatureRestore!=null) {
            this.server.post('/restore', serviceWrapper(this.signatureRestore.checkSignatureRestoreRequest.bind(this.signatureRestore), this.signatureRestore.signatureRestore.bind(this.signatureRestore)));
        }

        return new Promise<void>(resolve => this.server.listen(port, host, () => {
            console.log("server started!");
            resolve();
        }));
    }

}