import {ITokenService} from "../interfaces/ITokenService";
import {Keyset} from "../nut02/Keyset";
import {ISecretStorage} from "../interfaces/storage/ISecretStorage";
import {KeysetWithStorage} from "./KeysetWithStorage";
import {ISignedMessageStorage} from "../interfaces/storage/ISignedMessageStorage";
import {isSignatureRestoreRequest, SignatureRestoreRequest} from "./types/SignatureRestoreRequest";
import {SignatureRestoreResponse} from "./types/SignatureRestoreResponse";

export class TokenSignatureRestore extends ITokenService {

    private readonly signatureStorage: ISignedMessageStorage;
    private readonly keysetSupportsSignatureRestore: boolean;

    constructor(keysets: Keyset<any>[], secretStorage: ISecretStorage, signatureStorage: ISignedMessageStorage) {
        super(keysets, secretStorage);
        this.signatureStorage = signatureStorage;
        let keysetSupportsSignatureRestore = false;
        keysets.forEach(keyset => {
            if(keyset instanceof KeysetWithStorage && keyset.supportsSignatureRestore()) keysetSupportsSignatureRestore = true;
        })
        this.keysetSupportsSignatureRestore = keysetSupportsSignatureRestore;
    }

    checkSignatureRestoreRequest(req: SignatureRestoreRequest) {
        return isSignatureRestoreRequest(req, this.keysetFields);
    }

    async signatureRestore(req: SignatureRestoreRequest): Promise<SignatureRestoreResponse> {
        const resp = await this.signatureStorage.getAll(req.outputs);

        return {
            outputs: resp.map(obj => obj.msg),
            signatures: resp.map(obj => obj.signature)
        }
    }

    getSupportedNuts(): { [p: string]: any } {
        return !this.keysetSupportsSignatureRestore ? {} : {
            "9": {
                supported: true
            }
        };
    }

    start(): Promise<void> {
        return Promise.resolve();
    }

}