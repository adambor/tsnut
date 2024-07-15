import {isProof, Proof} from "../../nut00/types/Proof";
import {BlindedMessage, isBlindedMessage} from "../../nut00/types/BlindedMessage";
import {IField} from "../../interfaces/crypto/IField";

export type SwapRequest = {
    inputs: Proof[],
    outputs: BlindedMessage[]
}

export function isSwapRequest(req: SwapRequest, fields: {[keysetId: string]: IField<any, any>}): req is SwapRequest {
    if(req.inputs==null || req.inputs.length===0) return false;
    if(req.outputs==null || req.outputs.length===0) return false;

    for(let input of req.inputs) {
        const field = fields[input.id];
        if(field==null || !isProof(input, field)) return false;
    }
    for(let output of req.outputs) {
        const field = fields[output.id];
        if(field==null || !isBlindedMessage(output, field)) return false;
    }

    return true;
}
