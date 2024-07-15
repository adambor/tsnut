import {BlindedMessage, isBlindedMessage} from "../../nut00/types/BlindedMessage";
import {IField} from "../../interfaces/crypto/IField";

export type MintRequest = {
    quote: string,
    outputs: BlindedMessage[]
};

export function isMintRequest(req: any, fields: {[keysetId: string]: IField<any, any>}): req is MintRequest {
    if(req.quote==null) return false;
    if(req.outputs==null || req.outputs.length===0) return false;
    for(let output of req.outputs) {
        const field = fields[output.id];
        if(field==null || !isBlindedMessage(output, field)) return false;
    }

    return true;
}