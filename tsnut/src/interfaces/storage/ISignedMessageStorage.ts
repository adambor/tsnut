import {BlindedMessage} from "../../nut00/types/BlindedMessage";
import {BlindSignature} from "../../nut00/types/BlindSignature";

export interface ISignedMessageStorage {

    store(data: {msg: BlindedMessage, signature: BlindSignature}): Promise<void>;
    storeAll(data: {msg: BlindedMessage, signature: BlindSignature}[]): Promise<void>;
    get(msg: BlindedMessage): Promise<BlindSignature>;
    getAll(msgs: BlindedMessage[]): Promise<{msg: BlindedMessage, signature: BlindSignature}[]>;

}
