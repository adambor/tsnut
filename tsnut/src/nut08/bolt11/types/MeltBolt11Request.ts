import {IField} from "../../../interfaces/crypto/IField";
import {isNUT08MeltRequest, NUT08MeltRequest} from "../../types/NUT08MeltRequest";

export type MeltBolt11Request = NUT08MeltRequest;

export function isMeltBolt11Request(req: any, fields: {[keysetId: string]: IField<any, any>}): req is MeltBolt11Request {
    return isNUT08MeltRequest(req, fields);
}