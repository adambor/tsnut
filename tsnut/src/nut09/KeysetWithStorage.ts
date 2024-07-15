import {Keyset} from "../nut02/Keyset";
import {IField} from "../interfaces/crypto/IField";
import {BDHKEKey} from "../nut00/BDHKE";
import {ISignedMessageStorage} from "../interfaces/storage/ISignedMessageStorage";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";

export class KeysetWithStorage<F extends IField<any, any>> extends Keyset<F> {

    signatureStorage: ISignedMessageStorage;

    constructor(
        unit: string,
        keys: {
            [amount: number]: BDHKEKey<F>;
        },
        active: boolean,
        inputFeePpk: number,
        signatureStorage?: ISignedMessageStorage
    ) {
        super(unit, keys, active, inputFeePpk);
        this.signatureStorage = signatureStorage;
    }

    supportsSignatureRestore(): boolean {
        return this.signatureStorage!=null;
    }

    async signBlindedMessages(messages: {index: number, msg: BlindedMessage}[]): Promise<{index: number, sig: BlindSignature}[]> {
        const blindSignatures = await super.signBlindedMessages(messages);

        if(this.signatureStorage!=null) {
            const toSave: {msg: BlindedMessage, signature: BlindSignature}[] =
                blindSignatures.map((blindSignature, i) => {
                    return {
                        msg: messages[i].msg,
                        signature: blindSignature.sig
                    }
                });
            await this.signatureStorage.storeAll(toSave);
        }

        return blindSignatures;
    }

}
