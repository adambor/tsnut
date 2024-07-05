import {isInteger} from "../../utils/NumberUtils";

export type MeltQuoteResponse = {
    quote: string,
    amount: number,
    fee_reserve: number,
    paid: number,
    expiry: number
};

export function isMeltQuoteResponse(msg: any): msg is MeltQuoteResponse {
    if(msg.quote==null) return false;
    if(!isInteger(msg.amount)) return false;
    if(!isInteger(msg.fee_reserve)) return false;
    if(msg.paid==null) return false;
    if(!isInteger(msg.expiry)) return false;
    return true;
}
