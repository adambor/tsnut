import {isMeltRequest, MeltRequest} from "../../types/MeltRequest";
import {IField} from "../../../interfaces/crypto/IField";

export type MeltBolt11Request = MeltRequest;

export function isMeltBolt11Request(req: any, fields: {[keysetId: string]: IField<any, any>}): req is MeltBolt11Request {
    return isMeltRequest(req, fields);
}