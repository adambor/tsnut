import {ISignedMessageStorage} from "tsnut/dist/interfaces/storage/ISignedMessageStorage";
import {BlindedMessage, BlindSignature, DataWithPoint} from "tsnut";
import {open, RootDatabase} from "lmdb";

function getKey(msg: BlindedMessage): Buffer {
    return Buffer.from(msg.B_, "hex");
}

export class LMDBSignatureStorage implements ISignedMessageStorage {

    db: RootDatabase<BlindSignature, Buffer>;

    constructor(directory: string) {
        this.db = open<BlindSignature, Buffer>({
            path: directory,
            compression: true,
            keyEncoding: "binary"
        });
    }

    get(msg: BlindedMessage): Promise<BlindSignature> {
        return Promise.resolve(this.db.get(getKey(msg)));
    }

    async getAll(msgs: BlindedMessage[]): Promise<{ msg: BlindedMessage; signature: BlindSignature }[]> {
        const keys = msgs.map(msg => getKey(msg));
        const signatures = await this.db.getMany(keys);

        const resp: { msg: BlindedMessage; signature: BlindSignature }[] = [];
        signatures.forEach((signature, i) => {
            if(signature!=null) resp.push({msg: msgs[i], signature});
        });

        return resp;
    }

    async store(data: { msg: BlindedMessage; signature: BlindSignature }): Promise<void> {
        await this.db.put(getKey(data.msg), data.signature);
    }

    async storeAll(data: { msg: BlindedMessage; signature: BlindSignature }[]): Promise<void> {
        const toBeSaved = data.map(pair => {
            return {
                id: getKey(pair.msg),
                signature: pair.signature
            }
        });
        await this.db.transaction<void>(() => {
            toBeSaved.forEach(data => this.db.put(data.id, data.signature));
        });
    }

}