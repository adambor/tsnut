import {NUT01Keyset} from "../nut01/NUT01Keyset";
import {IScalar} from "../interfaces/crypto/IScalar";
import {IPoint} from "../interfaces/crypto/IPoint";
import {BDHKEKey} from "../nut00/BDHKE";
import {isInteger} from "../utils/NumberUtils";
import {createHash} from "crypto";

const version = 0x00;

export class Keyset<S extends IScalar<P>, P extends IPoint<S>> extends NUT01Keyset<S, P> {

    active: boolean;
    inputFeePpk: number;

    smallestDenomination: number;

    constructor(
        unit: string,
        keys: {
            [amount: number]: BDHKEKey<S,P>;
        },
        active: boolean,
        inputFeePpk: number
    ) {
        const sortedAmounts = Object.keys(keys)
            .map(key => parseInt(key))
            .sort((a, b) => a-b);

        const publicKeys = sortedAmounts
            .map(amount => this.keys[amount].getPublicKey().toHex());

        const publicKeysHash = createHash("sha256").update(Buffer.from(publicKeys.join(""), "hex")).digest().toString("hex");
        const publicKeysFingerprint = publicKeysHash.substring(0, 14);

        const versionByte = version.toString(16).padStart(2, "0");
        if(versionByte.length!==2) throw new Error("Invalid version byte");

        const keysetId = versionByte+publicKeysFingerprint;

        super(keysetId, unit, keys);

        this.active = active;
        if(!isInteger(this.inputFeePpk)) throw new Error("Invalid inputFeePpk");
        this.inputFeePpk = inputFeePpk;

        this.smallestDenomination = sortedAmounts[0];
    }

    getInputFeePpk(): number {
        return this.inputFeePpk;
    }

    isActive(): boolean {
        return this.active;
    }

    getSmallestDenomination(): number {
        return this.smallestDenomination;
    }

    // getFee(numInputs: number): number {
    //     return Math.ceil(Math.round(numInputs*this.inputFeePpk)/Math.round(1000*this.smallestDenomination)) * this.smallestDenomination;
    // }

}