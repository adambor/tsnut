import {BlindedMessage} from "./types/BlindedMessage";
import {BlindSignature} from "./types/BlindSignature";
import {Proof} from "./types/Proof";
import {IScalar} from "../interfaces/crypto/IScalar";
import {IField} from "../interfaces/crypto/IField";
import {IPoint} from "../interfaces/crypto/IPoint";

export class BDHKEKey<S extends IScalar<P>, P extends IPoint<S>> {

    private field: IField<S, P>;
    private key: S;

    constructor(key: S) {
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

    getPublicKey(): P {
        return this.field.generator().mul(this.key);
    }

    getField(): IField<S, P> {
        return this.field;
    }

}
