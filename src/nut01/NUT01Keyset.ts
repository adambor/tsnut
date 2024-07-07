import {BDHKEKey} from "../nut00/BDHKE";
import {IScalar} from "../interfaces/crypto/IScalar";
import {IPoint} from "../interfaces/crypto/IPoint";
import {KeysetResponse} from "./types/KeysetResponse";
import {Proof} from "../nut00/types/Proof";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";
import {IField} from "../interfaces/crypto/IField";

export class NUT01Keyset<F extends IField<any, any>> {

    private field: F;

    id: string;
    unit: string;
    keys: {
        [amount: number]: BDHKEKey<F>;
    };

    bakedResponse: KeysetResponse;

    constructor(id: string, unit: string, keys: {
        [amount: number]: BDHKEKey<F>;
    }) {
        this.id = id;
        this.unit = unit;
        if(this.keys==null || Object.keys(this.keys).length===0) throw new Error("No keys provided");
        this.keys = keys;

        const publicKeys: {[amount: number]: string} = {};
        for(let amount in keys) {
            publicKeys[amount] = keys[amount].getPublicKey().toHex();
            this.field = keys[amount].getField();
        }

        this.bakedResponse = {
            id: id,
            unit: this.unit,
            keys: publicKeys
        }
    }

    verifyProofs(proofs: Proof[]): boolean {
        for(let proof of proofs) {
            const key = this.keys[proof.amount];
            if(key==null) throw new Error("Invalid denomination used");
            if(!key.verify(proof)) return false;
        }
        return true;
    }

    signBlindedMessages(messages: {index: number, msg: BlindedMessage}[]): Promise<{index: number, sig: BlindSignature}[]> {
        return Promise.resolve(messages.map(message => {
            const key = this.keys[message.msg.amount];
            if(key==null) throw new Error("Invalid denomination used");
            return {
                index: message.index,
                sig: key.sign(message.msg)
            };
        }));
    }

    getKeysetResponse(): KeysetResponse {
        return this.bakedResponse;
    }

    getId(): string {
        return this.id;
    }

    getUnit(): string {
        return this.unit;
    }

    getField(): F {
        return this.field;
    }

}