import {BDHKEKey} from "../nut00/BDHKE";
import {KeysetResponse} from "./types/KeysetResponse";
import {Proof} from "../nut00/types/Proof";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";
import {IField} from "../interfaces/crypto/IField";
import {IPoint} from "../interfaces/crypto/IPoint";
import {BDHKEKeyWithDLEQ} from "../nut12/BDHKEwithDLEQ";

export class NUT01Keyset<F extends IField<any, any>> {

    private readonly field: F;

    id: string;
    unit: string;
    keys: {
        [amount: number]: BDHKEKey<F>;
    };

    bakedResponse: KeysetResponse;

    protected readonly supportsDLEQ: boolean;

    constructor(id: string, unit: string, keys: {
        [amount: number]: BDHKEKey<F>;
    }) {
        this.id = id;
        this.unit = unit;
        if(keys==null || Object.keys(keys).length===0) throw new Error("No keys provided");
        this.keys = keys;

        const publicKeys: {[amount: string]: string} = {};
        let supportsDLEQ = true;
        for(let amount in keys) {
            publicKeys[amount] = keys[amount].getPublicKey().toHex();
            this.field = keys[amount].getField();
            if(!(keys[amount] instanceof BDHKEKeyWithDLEQ)) supportsDLEQ = false;
        }
        this.supportsDLEQ = supportsDLEQ;

        this.bakedResponse = {
            id: id,
            unit: this.unit,
            keys: publicKeys
        }
    }

    verifyProofs(proofs: Proof[]): (Proof & {point: IPoint<F>})[] {
        const outputProofs: (Proof & {point: IPoint<F>})[] = [];
        for(let proof of proofs) {
            const key = this.keys[proof.amount];
            if(key==null) throw new Error("Invalid denomination used");
            const point = key.verify(proof);
            if(point==null) return null;
            outputProofs.push({...proof, point});
        }
        return outputProofs;
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

    hasDLEQSupport(): boolean {
        return this.supportsDLEQ;
    }

}