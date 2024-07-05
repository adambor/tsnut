import {isMintQuoteResponse, MintQuoteResponse} from "../../types/MintQuoteResponse";

export type MintQuoteBolt11Response = MintQuoteResponse & {
    request: string
};

export function isMintQuoteBolt11Response(msg: any): msg is MintQuoteBolt11Response {
    if(!isMintQuoteResponse(msg)) return false;
    if(msg.request==null) return false;
    return true;
}
