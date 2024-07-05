
export type MeltQuoteRequest = {
    unit: string
};

export function isMeltQuoteRequest(msg: any, alowedUnits?: Set<string>): msg is MeltQuoteRequest {
    if(msg.unit==null) return false;
    if(alowedUnits!=null && !alowedUnits.has(msg.unit)) return false;
    return true;
}
