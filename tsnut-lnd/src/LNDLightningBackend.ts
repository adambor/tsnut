import {ILightningBackend, LightningInvoiceStatus, LightningPaymentStatus} from "tsnut";
import {
    AuthenticatedLnd,
    authenticatedLndGrpc,
    createInvoice, getHeight,
    getInvoice, getPayment,
    getRouteToDestination, getWalletInfo,
    probeForRoute, subscribeToPastPayment, subscribeToPayViaRequest
} from "lightning";

const lnService = require("ln-service");

export type LNDOptions = {
    feeMultiplier?: number,
    minFeePct?: number,
    minBaseFee?: number,
    probe?: boolean
}

export class LNDLightningBackend implements ILightningBackend {

    private readonly lnd: AuthenticatedLnd;
    private readonly options: LNDOptions;

    constructor(
        cert: string,
        macaroon: string,
        socket: string,
        options?: LNDOptions
    ) {
        if(options==null) options = {};
        if(options.feeMultiplier==null) options.feeMultiplier = 1.5;
        if(options.minFeePct==null) options.minFeePct = 0.2;
        if(options.minBaseFee==null) options.minBaseFee = 5;
        this.options = options;

        const {lnd} = authenticatedLndGrpc({
            cert,
            macaroon,
            socket
        });
        this.lnd = lnd;
    }

    async createInvoice(amount: number, expirySeconds: number): Promise<{ pr: string; id: string; expiry: number }> {
        if(amount==null || !Number.isSafeInteger(amount)) throw new Error("Invalid amount specified!");

        const expiryDate = new Date(Date.now()+(expirySeconds*1000));

        const resp = await createInvoice({
            tokens: amount,
            expires_at: expiryDate.toISOString(),
            lnd: this.lnd
        });

        return {
            pr: resp.request,
            id: resp.id,
            expiry: Math.floor(expiryDate.getTime()/1000)
        };
    }

    async estimatePaymentFee(pr: string): Promise<number> {
        const res = lnService.parsePaymentRequest({request: pr});

        const { current_block_height } = await getHeight({lnd: this.lnd});
        const req = {
            destination: res.destination,
            mtokens: res.mtokens,
            total_mtokens: res.mtokens,
            cltv_delta: res.cltv_delta,
            payment: res.payment,
            routes: res.routes,
            is_ignoring_past_failures: true,
            max_fee_mtokens: (BigInt(10000) + BigInt(res.mtokens)*BigInt(1)/BigInt(100)).toString(),
            max_timeout_height: current_block_height+500,
            lnd: this.lnd,
        };
        console.log("Estimate fee req: ", req);

        let returnedFee: number;
        if(this.options.probe) {
            const probeResp = await probeForRoute(req);
            console.log("Probe fee resp: ", probeResp);
            if(probeResp.route==null) return null;
            returnedFee = probeResp.route.safe_fee;
        } else {
            const routeResp = await getRouteToDestination(req);
            console.log("Route fee resp: ", routeResp);
            if(routeResp.route==null) return null;
            returnedFee = routeResp.route.safe_fee;
        }

        returnedFee = Math.ceil(returnedFee*this.options.feeMultiplier);

        const minFee = this.options.minBaseFee+Math.floor(res.safe_tokens*this.options.minFeePct/100);

        return Math.max(returnedFee, minFee);
    }

    async getInvoiceStatus(id: string): Promise<LightningInvoiceStatus> {
        const invoice = await getInvoice({
            id,
            lnd: this.lnd
        });
        if(invoice==null) return null;
        if(invoice.is_canceled) return LightningInvoiceStatus.CANCELED;
        if(invoice.is_held) return LightningInvoiceStatus.RECEIVED;
        if(invoice.is_confirmed) return LightningInvoiceStatus.SETTLED;
        if(new Date(invoice.expires_at).getTime()<Date.now()) return LightningInvoiceStatus.EXPIRED;
        return LightningInvoiceStatus.CREATED;
    }

    getPaymentStatus(id: string): Promise<LightningPaymentStatus> {
        return Promise.resolve(undefined);
    }

    getUnit(): string {
        return "sat";
    }

    isValidBolt11Request(pr: string): boolean {
        try {
            const res = lnService.parsePaymentRequest({request: pr});
            return res.mtokens!=null;
        } catch (e) {
            return false;
        }
    }

    parseInvoice(pr: string): { id: string; amount: number; expiry: number } {
        const res = lnService.parsePaymentRequest({request: pr});
        return {
            amount: res.safe_tokens,
            expiry: Math.floor(new Date(res.expires_at).getTime()/1000),
            id: res.id
        };
    }

    payInvoice(pr: string, maxFee: number): Promise<void> {
        const paymentEventEmitter = subscribeToPayViaRequest({
            max_fee: maxFee,
            request: pr,
            lnd: this.lnd
        });
        return new Promise<void>((resolve, reject) => {
            let onFailed: (obj: any) => void, onPaying: (obj: any) => void;
            onPaying = (obj) => {
                console.log("[LND] Payment init: ", obj);
                resolve();
                paymentEventEmitter.removeListener("failed", onFailed);
                paymentEventEmitter.removeListener("paying", onPaying);
            };
            onFailed = (obj) => {
                console.log("[LND] Payment fail: ", obj);
                if(obj.is_insufficient_balance) reject(new Error("Insufficient balance"));
                if(obj.is_invalid_payment) reject(new Error("Invalid payment secret"));
                if(obj.is_pathfinding_timeout) reject(new Error("Pathfinding timed out"));
                if(obj.is_route_not_found) reject(new Error("Route not found"));
                paymentEventEmitter.removeListener("failed", onFailed);
                paymentEventEmitter.removeListener("paying", onPaying);
            }
            paymentEventEmitter.on("failed", onFailed);
            paymentEventEmitter.on("paying", onPaying);
        });
    }

    waitForPayment(id: string): Promise<{preimage: string, actualFee: number}> {
        const paymentEventEmitter = subscribeToPastPayment({id, lnd: this.lnd});
        return new Promise<{preimage: string, actualFee: number}>((resolve, reject) => {
            let onFailed: (obj: any) => void, onConfirmed: (obj: any) => void;
            const unsubscribe = () => {
                paymentEventEmitter.removeListener("failed", onFailed);
                paymentEventEmitter.removeListener("confirmed", onConfirmed);
            };
            onConfirmed = (obj) => {
                console.log("[LND] Payment confirmed: ", obj);
                resolve({preimage: obj.secret, actualFee: obj.safe_fee});
                unsubscribe();
            };
            onFailed = (obj) => {
                console.log("[LND] Payment fail: ", obj);
                resolve(null);
                unsubscribe();
            }
            paymentEventEmitter.on("failed", onFailed);
            paymentEventEmitter.on("confirmed", onConfirmed);
            getPayment({id, lnd: this.lnd}).then(res => {
                console.log("[LND] Payment result: ", res);
                if(res.is_confirmed) {
                    resolve({preimage: res.payment.secret, actualFee: res.payment.safe_fee});
                    unsubscribe();
                }
                if(res.is_failed) {
                    resolve(null);
                    unsubscribe();
                }
            }).catch(e => {
                reject(e);
                unsubscribe();
            });
        });
    }

    async getPubkey(): Promise<string> {
        const walletInfo = await getWalletInfo({lnd: this.lnd});
        return walletInfo.public_key;
    }
}