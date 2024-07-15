import {isMeltResponse, MeltResponse} from "../../nut05/types/MeltResponse";
import {BlindSignature, isBlindSignature} from "../../nut00/types/BlindSignature";
import {IField} from "../../interfaces/crypto/IField";

export type NUT08MeltResponse = MeltResponse & {
    change?: BlindSignature[]
};

export function isNUT08MeltResponse(resp: any, fields: {[keysetId: string]: IField<any, any>}): resp is NUT08MeltResponse {
    for(let output of resp.change) {
        const field = fields[output.id];
        if(field==null || !isBlindSignature(output, field)) return false;
    }
    return isMeltResponse(resp, fields);
}
