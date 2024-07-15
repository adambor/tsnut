import {IField} from "../../interfaces/crypto/IField";

export type MeltResponse = {
    paid: boolean
};

export function isMeltResponse(req: any, fields: {[keysetId: string]: IField<any, any>}): req is MeltResponse {
    if(req.paid==null) return false;
    return true;
}