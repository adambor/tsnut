import {isInteger} from "../../utils/NumberUtils";

export type MintQuoteRequest = {
    amount: number,
    unit: string
};

export function isMintQuoteRequest(msg: any, alowedUnits?: Set<string>): msg is MintQuoteRequest {
    if(!isInteger(msg.amount)) return false;
    if(msg.unit==null) return false;
    if(alowedUnits!=null && !alowedUnits.has(msg.unit)) return false;
    return true;
}
