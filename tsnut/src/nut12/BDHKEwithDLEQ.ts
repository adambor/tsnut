import {BDHKEKey} from "../nut00/BDHKE";
import {IField} from "../interfaces/crypto/IField";
import {IScalar} from "../interfaces/crypto/IScalar";
import {IPoint} from "../interfaces/crypto/IPoint";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";

export type BlindSignatureWithDLEQ = BlindSignature & {
    dleq: {
        e: string,
        s: string
    }
};

export class BDHKEKeyWithDLEQ<F extends IField<IScalar<F>, IPoint<F>>> extends BDHKEKey<F> {

    sign(input: BlindedMessage): BlindSignatureWithDLEQ {
        const blindSignature = super.sign(input);

        const B_ = this.field.hexToPoint(input.B_);
        const C_ = this.field.hexToPoint(blindSignature.C_);

        let e: IScalar<F>;
        let r: IScalar<F>;
        let R1: IPoint<F>;
        let R2: IPoint<F>;
        do {
            r = this.field.randomScalar();
            R1 = r.toPoint();
            R2 = B_.mul(r);

            e = this.field.hashPointsToScalar([R1, R2, this.publicKey, C_]);
        } while (e==null);

        const s = r.add(e.mul(this.key));

        return {
            ...blindSignature,
            dleq: {
                e: e.toHex(),
                s: s.toHex()
            }
        };
    }

}