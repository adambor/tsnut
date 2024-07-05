import {isInteger} from "../../utils/NumberUtils";

export type MintQuoteResponse = {
    quote: string,
    paid: boolean,
    expiry: number
};

export function isMintQuoteResponse(msg: any): msg is MintQuoteResponse {
    if(msg.quote==null) return false;
    if(msg.paid==null) return false;
    if(!isInteger(msg.expiry)) return false;
    return true;
}
