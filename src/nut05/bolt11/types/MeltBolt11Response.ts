import {isMeltResponse, MeltResponse} from "../../types/MeltResponse";
import {MeltBolt11Request} from "./MeltBolt11Request";
import {IField} from "../../../interfaces/crypto/IField";

export type MeltBolt11Response = MeltResponse & {
    payment_preimage: string | null,
}

export function isMeltBolt11Response(resp: any, fields: {[keysetId: string]: IField<any, any>}): resp is MeltBolt11Request {
    if(resp.payment_preimage!=null) {
        if(resp.payment_preimage.length!=64) return false;
    }
    return isMeltResponse(resp, fields);
}
