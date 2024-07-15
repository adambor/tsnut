import {isMeltRequest, MeltRequest} from "../../nut05/types/MeltRequest";
import {BlindedMessage, isBlindedMessage} from "../../nut00/types/BlindedMessage";
import {IField} from "../../interfaces/crypto/IField";
import {MeltBolt11Request} from "../bolt11/types/MeltBolt11Request";

export type NUT08MeltRequest = MeltRequest & {
    outputs: BlindedMessage[]
};

export function isNUT08MeltRequest(req: any, fields: {[keysetId: string]: IField<any, any>}): req is NUT08MeltRequest {
    for(let output of req.outputs) {
        const field = fields[output.id];
        if(field==null || !isBlindedMessage(output, field)) return false;
    }
    return isMeltRequest(req, fields);
}
