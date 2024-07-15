import {IField} from "../../interfaces/crypto/IField";
import {isInteger} from "../../utils/NumberUtils";

export type BlindedMessage = {
    amount: number,
    id: string,
    B_: string
};

export function isBlindedMessage(msg: any, field: IField<any, any>): msg is BlindedMessage {
    if(!isInteger(msg.amount)) return false;
    if(msg.id==null) return false;
    if(msg.B_==null || !field.isValidPoint(msg.B_)) return false;
    return true;
}
