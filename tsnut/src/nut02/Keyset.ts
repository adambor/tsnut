import {NUT01Keyset} from "../nut01/NUT01Keyset";
import {BDHKEKey} from "../nut00/BDHKE";
import {isInteger} from "../utils/NumberUtils";
import {createHash} from "crypto";
import {IField} from "../interfaces/crypto/IField";
import {KeysetSummaryResponse} from "./types/KeysetSummaryResponse";

const version = 0x00;

export class Keyset<F extends IField<any, any>> extends NUT01Keyset<F> {

    active: boolean;
    inputFeePpk: number;

    smallestDenomination: number;
    highestDenomination: number;

    denominations: number[];

    constructor(
        unit: string,
        keys: {
            [amount: number]: BDHKEKey<F>;
        },
        active: boolean,
        inputFeePpk: number
    ) {
        const sortedAmounts = Object.keys(keys)
            .map(key => parseInt(key))
            .sort((a, b) => a-b);

        const publicKeys = sortedAmounts
            .map(amount => keys[amount].getPublicKey().toHex());

        const publicKeysHash = createHash("sha256").update(Buffer.from(publicKeys.join(""), "hex")).digest().toString("hex");
        const publicKeysFingerprint = publicKeysHash.substring(0, 14);

        const versionByte = version.toString(16).padStart(2, "0");
        if(versionByte.length!==2) throw new Error("Invalid version byte");

        const keysetId = versionByte+publicKeysFingerprint;

        super(keysetId, unit, keys);

        this.denominations = sortedAmounts;
        this.active = active;
        if(!isInteger(inputFeePpk)) throw new Error("Invalid inputFeePpk");
        this.inputFeePpk = inputFeePpk;

        this.smallestDenomination = sortedAmounts[0];
        this.highestDenomination = sortedAmounts[sortedAmounts.length-1];
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

    getHighestDenomination(): number {
        return this.highestDenomination;
    }

    getKeysetSummaryResponse(): KeysetSummaryResponse {
        return {
            id: this.getId(),
            input_fee_ppk: this.inputFeePpk,
            active: this.active,
            unit: this.unit
        }
    }

    getDenominations(): number[] {
        return this.denominations;
    }

}