
export type MeltQuoteRequest = {
    unit: string
};

export function isMeltQuoteRequest(msg: any, allowedUnits?: Set<string>): msg is MeltQuoteRequest {
    if(msg.unit==null) return false;
    if(allowedUnits!=null && !allowedUnits.has(msg.unit)) return false;
    return true;
}
