import {NUT08TokenMelt} from "../NUT08TokenMelt";
import {SavedBolt11TokenMelt} from "./persistent/SavedBolt11TokenMelt";
import {isMeltQuoteBolt11Request, MeltQuoteBolt11Request} from "./types/MeltQuoteBolt11Request";
import {MeltQuoteBolt11Response} from "./types/MeltQuoteBolt11Response";
import {isMeltBolt11Request, MeltBolt11Request} from "./types/MeltBolt11Request";
import {MeltBolt11Response} from "./types/MeltBolt11Response";
import {ILightningBackend} from "../../interfaces/lightning/ILightningBackend";
import {Keyset} from "../../nut02/Keyset";
import {ILockableObjectStorage} from "../../interfaces/storage/ILockableObjectStorage";
import {IUnitConverter} from "../../interfaces/units/IUnitConverter";
import {NutError, NutErrorType} from "../../nut00/types/NutError";
import {ISecretStorage} from "../../interfaces/storage/ISecretStorage";
import {SavedTokenMeltState} from "../../nut05/persistent/SavedTokenMelt";

export class Bolt11TokenMelt extends NUT08TokenMelt<
    SavedBolt11TokenMelt,
    MeltQuoteBolt11Request,
    MeltQuoteBolt11Response,
    MeltBolt11Request,
    MeltBolt11Response
> {

    lightningBackend: ILightningBackend;
    supportsLightningFeeReturn: boolean;

    constructor(
        keysets: Keyset<any>[],
        secretStorage: ISecretStorage,
        meltStorage: ILockableObjectStorage<SavedBolt11TokenMelt>,
        lightningBackend: ILightningBackend,
        quoteExpirySeconds: number,
        unitConverter?: IUnitConverter,
        unitLimits?: {[unit: string]: {min: number, max: number}},
        supportsLightningFeeReturn?: boolean
    ) {
        super(keysets, secretStorage, meltStorage, quoteExpirySeconds, unitConverter, unitLimits);
        this.lightningBackend = lightningBackend;
        this.supportsLightningFeeReturn = supportsLightningFeeReturn;
    }

    getMethod(): string {
        return "bolt11";
    }

    checkMeltQuoteRequest(req: MeltQuoteBolt11Request): boolean {
        return isMeltQuoteBolt11Request(req, this.lightningBackend, this.allowedUnits);
    }

    checkMeltRequest(req: MeltBolt11Request): boolean {
        return isMeltBolt11Request(req, this.keysetFields);
    }

    async getQuote(quote: string): Promise<MeltQuoteBolt11Response> {
        const savedMelt = await this.storage.get(quote);
        if(savedMelt==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found");

        return {
            quote: savedMelt.getId(),
            amount: savedMelt.amount,
            fee_reserve: savedMelt.feeReserve,
            paid: savedMelt.getState()===SavedTokenMeltState.SUCCESS,
            expiry: savedMelt.expiry
        };
    }

    async meltQuote(request: MeltQuoteBolt11Request): Promise<MeltQuoteBolt11Response> {
        const networkFee = await this.lightningBackend.estimatePaymentFee(request.request);

        if(networkFee==null) {
            throw new NutError(NutErrorType.BOLT11_NOT_PAYABLE, "Invoice cannot be paid!");
        }

        const parsedInvoice = this.lightningBackend.parseInvoice(request.request);

        const amountInRequestedUnit = await this.unitConverter.convert(parsedInvoice.amount, this.lightningBackend.getUnit(), request.unit);
        const feeInRequestedUnit = await this.unitConverter.convert(networkFee, this.lightningBackend.getUnit(), request.unit);

        const quoteExpiry = Math.floor(Date.now()/1000) + this.quoteExpirySeconds;

        const savedMelt = new SavedBolt11TokenMelt(
            request.request,
            networkFee,
            amountInRequestedUnit,
            feeInRequestedUnit,
            request.unit,
            Math.min(quoteExpiry, parsedInvoice.expiry)
        );
        await this.storage.save(savedMelt);

        return {
            quote: savedMelt.getId(),
            amount: amountInRequestedUnit,
            fee_reserve: feeInRequestedUnit,
            paid: false,
            expiry: savedMelt.expiry
        };
    }

    protected async pay(savedMeltResp: { obj: SavedBolt11TokenMelt; lockId: string }): Promise<void> {
        const parsedInvoice = this.lightningBackend.parseInvoice(savedMeltResp.obj.pr);
        const paymentStatus = await this.lightningBackend.getPaymentStatus(parsedInvoice.id);
        if(paymentStatus==null) await this.lightningBackend.payInvoice(savedMeltResp.obj.pr, savedMeltResp.obj.maxFee);
    }

    protected async waitForPayment(savedMelt: SavedBolt11TokenMelt): Promise<MeltBolt11Response> {
        const parsedInvoice = this.lightningBackend.parseInvoice(savedMelt.pr);
        const resp = await this.lightningBackend.waitForPayment(parsedInvoice.id);

        if(resp==null) {
            return {
                paid: false,
                payment_preimage: null
            };
        } else {
            if(this.supportsLightningFeeReturn) {
                const actualFeeInUnits = await this.unitConverter.convert(resp.actualFee, this.lightningBackend.getUnit(), savedMelt.unit);
                const signatures = await this.signChangeOutputs(savedMelt.outputs, savedMelt.feeReserve, actualFeeInUnits);

                return {
                    paid: true,
                    payment_preimage: resp.preimage,
                    change: signatures
                };
            } else {
                return {
                    paid: true,
                    payment_preimage: resp.preimage
                };
            }
        }
    }

    getSupportedNuts(): { "5": any, "8"?: any } {
        const resp: { "5": any, "8"?: any } = {
            "5": {
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
        if(this.supportsLightningFeeReturn) resp["8"] = {
            supported: true
        };
        return resp;
    }

}