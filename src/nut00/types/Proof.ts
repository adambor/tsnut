import {IField} from "../../interfaces/crypto/IField";
import {isInteger} from "../../utils/NumberUtils";

export type Proof = {
    amount: number,
    id: string,
    secret: string,
    C: string
};

export type Proofs = Proof[];

export function isProof(msg: Proof, field: IField<any, any>): msg is Proof {
    if(!isInteger(msg.amount)) return false;
    if(msg.id==null) return false;
    if(msg.secret==null) return false;
    if(msg.C==null || !field.isValidPoint(msg.C)) return false;
    return true;
}
