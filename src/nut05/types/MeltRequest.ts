import {IField} from "../../interfaces/crypto/IField";
import {isProof, Proof} from "../../nut00/types/Proof";

export type MeltRequest = {
    quote: string,
    inputs: Proof[]
};

export function isMeltRequest(req: any, fields: {[keysetId: string]: IField<any, any>}): req is MeltRequest {
    if(req.quote==null) return false;
    if(req.inputs==null || req.inputs.length===0) return false;
    for(let input of req.inputs) {
        const field = fields[input.id];
        if(field==null || !isProof(input, field)) return false;
    }

    return true;
}