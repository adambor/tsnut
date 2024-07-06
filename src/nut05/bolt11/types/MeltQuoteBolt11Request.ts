import {isMeltQuoteRequest, MeltQuoteRequest} from "../../types/MeltQuoteRequest";
import {ILightningBackend} from "../../../interfaces/lightning/ILightningBackend";


export type MeltQuoteBolt11Request = MeltQuoteRequest & {
    request: string
};

export function isMeltQuoteBolt11Request(msg: any, lightningBackend: ILightningBackend, allowedUnits?: Set<string>): msg is MeltQuoteBolt11Request {
    if(msg.request==null || !lightningBackend.isValidBolt11Request(msg.request)) return false;
    return isMeltQuoteRequest(msg, allowedUnits);
}
