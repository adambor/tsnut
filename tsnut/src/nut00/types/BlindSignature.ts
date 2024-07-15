import {IField} from "../../interfaces/crypto/IField";
import {isInteger} from "../../utils/NumberUtils";

export type BlindSignature = {
    amount: number,
    id: string,
    C_: string
};

export function isBlindSignature(msg: any, field: IField<any, any>): msg is BlindSignature {
    if(!isInteger(msg.amount)) return false;
    if(msg.id==null) return false;
    if(msg.C_==null || !field.isValidPoint(msg.C_)) return false;
    return true;
}
