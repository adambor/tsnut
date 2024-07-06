import {Keyset} from "../nut02/Keyset";
import {IField} from "./crypto/IField";
import {IObjectStorage} from "./storage/IObjectStorage";
import {SavedTokenSwap} from "../nut03/persistent/SavedTokenSwap";
import {Proof} from "../nut00/types/Proof";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";
import {NutError, NutErrorType} from "../nut00/types/NutError";


export abstract class ITokenService {

    keysets: {
        [id: string]: Keyset<any, any>
    } = {};
    keysetFields: {
        [id: string]: IField<any, any>
    } = {};
    secretStorage: ISecretStorage;

    constructor(keysets: Keyset<any, any>[], secretStorage: ISecretStorage) {
        this.secretStorage = secretStorage;
        keysets.forEach(keyset => {
            this.keysets[keyset.getId()] = keyset;
            this.keysetFields[keyset.getId()] = keyset.getField();
        });
    }

    protected sortInputsByKeysetId(inputs: Proof[]): {[keysetId: string]: Proof[]} {
        const proofs: {[keysetId: string]: Proof[]} = {};
        inputs.forEach(proof => {
            if(proofs[proof.id]==null) proofs[proof.id] = [];
            proofs[proof.id].push(proof);
        });
        return proofs;
    }

    protected sortOutputsByKeysetId(outputs: BlindedMessage[]): {[keysetId: string]: {index: number, msg: BlindedMessage}[]} {
        const blindedMessages: {[keysetId: string]: {index: number, msg: BlindedMessage}[]} = {};
        outputs.forEach((msg, index) => {
            if(blindedMessages[msg.id]==null) blindedMessages[msg.id] = [];
            blindedMessages[msg.id].push({
                msg: msg,
                index
            });
        });
        return blindedMessages;
    }

    protected hasOnlyActiveKeysets(blindedMessages: {[keysetId: string]: {index: number, msg: BlindedMessage}[]}): boolean {
        for(let keysetId in blindedMessages) {
            if(!this.keysets[keysetId].isActive()) return false;
        }
        return true;
    }

    protected verifyInputProofs(proofs: {[keysetId: string]: Proof[]}) {
        for(let keysetId in proofs) {
            if(!this.keysets[keysetId].verifyProofs(proofs[keysetId])) return false;
        }
        return true;
    }

    protected async signBlindedMessages(blindedMessages: {[keysetId: string]: {index: number, msg: BlindedMessage}[]}): Promise<BlindSignature[]> {
        const blindSignatures: BlindSignature[] = [];
        for(let keysetId in blindedMessages) {
            const results = await this.keysets[keysetId].signBlindedMessages(blindedMessages[keysetId]);
            results.forEach(result => blindSignatures[result.index] = result.sig);
        }
        return blindSignatures;
    }

    abstract getSupportedNuts(): {[nutId: string]: any};

}