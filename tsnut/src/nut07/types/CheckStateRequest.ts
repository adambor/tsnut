import {IField} from "../../interfaces/crypto/IField";

export type CheckStateRequest = {
    Ys: string[]
};

export function isCheckStateRequest(msg: any, fields?: IField<any, any>[]): msg is CheckStateRequest {
    if(msg.Ys==null) return false;
    if(fields!=null) {
        for(let Y of msg.Ys) {
            let valid = false;
            for(let field of fields) {
                valid = field.isValidPoint(Y);
                if(valid) break;
            }
            if(!valid) return false;
        }
    }
    return true;
}
