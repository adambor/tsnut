import {Keyset} from "../../nut02/Keyset";
import {TokenMint} from "../TokenMint";
import {SavedBolt11TokenMint} from "./persistent/SavedBolt11TokenMint";
import {isMintQuoteBolt11Request, MintQuoteBolt11Request} from "./types/MintQuoteBolt11Request";
import {MintQuoteBolt11Response} from "./types/MintQuoteBolt11Response";
import {ILockableObjectStorage} from "../../interfaces/storage/ILockableObjectStorage";
import {ILightningBackend, LightningInvoiceStatus} from "../../interfaces/lightning/ILightningBackend";
import {NutError, NutErrorType} from "../../nut00/types/NutError";
import {MintResponse} from "../types/MintResponse";
import {MintRequest} from "../types/MintRequest";
import {IUnitConverter} from "../../interfaces/units/IUnitConverter";
import {ISecretStorage} from "../../interfaces/storage/ISecretStorage";

export class Bolt11TokenMint extends TokenMint<
    SavedBolt11TokenMint,
    MintQuoteBolt11Request,
    MintQuoteBolt11Response
> {

    lightningBackend: ILightningBackend;

    constructor(
        keysets: Keyset<any>[],
        secretStorage: ISecretStorage,
        storage: ILockableObjectStorage<SavedBolt11TokenMint>,
        lightningBackend: ILightningBackend,
        quoteExpirySeconds: number,
        unitConverter?: IUnitConverter,
        unitLimits?: {[unit: string]: {min: number, max: number}}
    ) {
        super(keysets, secretStorage, storage, quoteExpirySeconds, unitConverter, unitLimits);
        this.lightningBackend = lightningBackend;
    }

    getMethod(): string {
        return "bolt11";
    }

    checkMintQuoteRequest(req: MintQuoteBolt11Request): boolean {
        return isMintQuoteBolt11Request(req, this.allowedUnits);
    }

    async mintQuote(request: MintQuoteBolt11Request): Promise<MintQuoteBolt11Response> {
        const invoiceAmount = await this.unitConverter.convert(request.amount, request.unit, this.lightningBackend.getUnit());
        const invoice = await this.lightningBackend.createInvoice(invoiceAmount, this.quoteExpirySeconds);

        const savedMint = new SavedBolt11TokenMint(invoice.pr, request.amount, request.unit);
        await this.storage.save(savedMint);

        return {
            quote: savedMint.getId(),
            request: invoice.pr,
            expiry: invoice.expiry,
            paid: false
        };
    }

    async getQuote(quote: string): Promise<MintQuoteBolt11Response> {
        const savedMint = await this.storage.get(quote);
        if(savedMint==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found");

        const parsedInvoice = this.lightningBackend.parseInvoice(savedMint.pr);

        if(!savedMint.paid) {
            const status = await this.lightningBackend.getInvoiceStatus(parsedInvoice.id);
            if(status===LightningInvoiceStatus.SETTLED) {
                savedMint.paid = true;
            }
        }

        return {
            quote: savedMint.getId(),
            request: savedMint.pr,
            expiry: parsedInvoice.expiry,
            paid: savedMint.paid
        };
    }

    async mint(request: MintRequest): Promise<MintResponse> {
        const actionId = request.quote;
        const savedMintResp = await this.storage.getAndLock(actionId, 60);
        if(savedMintResp==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found");

        const savedMint = savedMintResp.obj;

        if(!savedMint.paid) {
            const parsedInvoice = this.lightningBackend.parseInvoice(savedMint.pr);
            const status = await this.lightningBackend.getInvoiceStatus(parsedInvoice.id);
            if(status===LightningInvoiceStatus.SETTLED) {
                savedMint.paid = true;
            }
        }

        return await this._mint(request, savedMintResp);
    }

    getSupportedNuts(): { "4": any } {
        return {
            "4": {
                methods: Object.keys(this.unitLimits).map(unit => {
                    const limits = this.unitLimits[unit];
                    return {
                        method: "bolt11",
                        unit,
                        min_amount: limits.min,
                        max_amount: limits.max
                    }
                }),
                disabled: this.allowedUnits.size===0
            }
        };
    }

}