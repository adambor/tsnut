import {isMintQuoteResponse, MintQuoteResponse} from "../../types/MintQuoteResponse";

export type MintQuoteBolt11Response = MintQuoteResponse & {
    request: string
};

export function isMintQuoteBolt11Response(msg: any): msg is MintQuoteBolt11Response {
    if(msg.request==null) return false;
    return isMintQuoteResponse(msg);
}
