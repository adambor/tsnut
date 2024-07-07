import {BlindedMessage} from "./types/BlindedMessage";
import {BlindSignature} from "./types/BlindSignature";
import {Proof} from "./types/Proof";
import {IField} from "../interfaces/crypto/IField";
import {IPoint} from "../interfaces/crypto/IPoint";
import {IScalar} from "../interfaces/crypto/IScalar";

export class BDHKEKey<F extends IField<IScalar<F>, IPoint<F>>> {

    private field: F;
    private key: IScalar<F>;

    constructor(key: IScalar<F>) {
        this.field = key.getField();
        this.key = key;
    }

    sign(input: BlindedMessage): BlindSignature {
        const B_ = this.field.hexToPoint(input.B_);
        //C_ = kB_
        const C_ = this.key.sign(B_);
        return {
            amount: input.amount,
            id: input.id,
            C_: C_.toHex()
        }
    }

    verify(input: Proof): boolean {
        const x = Buffer.from(input.secret, "utf8");
        const C = this.field.hexToPoint(input.C);
        //k*hash_to_curve(x) == C
        return this.key.sign(this.field.hashToField(x)).equals(C);
    }

    getPublicKey(): IPoint<F> {
        return this.key.toPoint();
    }

    getField(): F {
        return this.field;
    }

}
