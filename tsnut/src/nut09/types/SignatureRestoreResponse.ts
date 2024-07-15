import {BlindedMessage} from "../../nut00/types/BlindedMessage";
import {BlindSignature} from "../../nut00/types/BlindSignature";

export type SignatureRestoreResponse = {
    outputs: BlindedMessage[],
    signatures: BlindSignature[]
};
