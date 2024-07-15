import {DataWithPoint, IPoint, ISecretStorage, StoredSecretState} from "tsnut";
import {open, RootDatabase} from "lmdb";

function getKey(dataPoint: DataWithPoint): Buffer {
    return Buffer.from(dataPoint.point.toHex(), "hex");
}

type SavedData = {id: string, amount: number, secret: string, locked: boolean, actionId: string};

export class LMDBSecretStorage implements ISecretStorage {

    db: RootDatabase<SavedData, Buffer>;

    constructor(directory: string) {
        this.db = open<SavedData, Buffer>({
            path: directory,
            compression: true,
            keyEncoding: "binary"
        });
    }

    addBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const keys = data.map(dataPoint => getKey(dataPoint));
        return this.db.transaction<void>(() => {
            const keyValues: {key: Buffer, value: SavedData}[] = [];
            for(let key of keys) {
                const value = this.db.get(key);
                if(value==null || !value.locked || value.actionId!==actionId) throw new Error("Secret locked under different actionId!");
                keyValues.push({key, value});
            }
            for(let keyValue of keyValues) {
                keyValue.value.locked = false;
                this.db.put(keyValue.key, keyValue.value);
            }
        });
    }

    hasAnyOfBatch(data: DataWithPoint[]): Promise<boolean> {
        return this.db.getMany(data.map(dataPoint => getKey(dataPoint)))
            .then(result => !result.every(val => val==null));
    }

    hasAnyOfBatchAndLock(data: DataWithPoint[], actionId: string): Promise<boolean> {
        const dataWithKeys = data.map(dataPoint => {
            return {key: getKey(dataPoint), proof: dataPoint};
        });
        return this.db.transaction<boolean>(() => {
            for(let {key, proof} of dataWithKeys) {
                if(this.db.doesExist(key)) return true;
            }
            for(let {key, proof} of dataWithKeys) {
                this.db.put(key, {
                    id: proof.id,
                    amount: proof.amount,
                    secret: proof.secret,
                    locked: true,
                    actionId
                });
            }
            return false;
        });
    }

    lockBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const dataWithKeys = data.map(dataPoint => {
            return {key: getKey(dataPoint), proof: dataPoint};
        });
        return this.db.transaction<void>(() => {
            for(let {key, proof} of dataWithKeys) {
                if(this.db.doesExist(key)) throw new Error("Locked secret already exists!");
            }
            for(let {key, proof} of dataWithKeys) {
                this.db.put(key, {
                    id: proof.id,
                    amount: proof.amount,
                    secret: proof.secret,
                    locked: true,
                    actionId
                });
            }
        });
    }

    removeBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const keys = data.map(dataPoint => getKey(dataPoint));
        return this.db.transaction<void>(() => {
            for(let key of keys) {
                const value = this.db.get(key);
                if(value==null || value.actionId!==actionId) throw new Error("Secret spent/locked under different actionId!");
            }
            for(let key of keys) {
                this.db.remove(key);
            }
        });
    }

    removeTryBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const keys = data.map(dataPoint => getKey(dataPoint));
        return this.db.transaction<void>(() => {
            for(let key of keys) {
                const value = this.db.get(key);
                if(value!=null && value.actionId===actionId) {
                    this.db.remove(key);
                }
            }
        });
    }

    unlockBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const keys = data.map(dataPoint => getKey(dataPoint));
        return this.db.transaction<void>(() => {
            for(let key of keys) {
                const value = this.db.get(key);
                if(value==null || value.actionId!==actionId) throw new Error("Secret locked under different actionId!");
            }
            for(let key of keys) {
                this.db.remove(key);
            }
        });
    }

    async unlockTryBatch(data: DataWithPoint[], actionId: string): Promise<void> {
        const keys = data.map(dataPoint => getKey(dataPoint));
        return this.db.transaction<void>(() => {
            for(let key of keys) {
                const value = this.db.get(key);
                if(value!=null && value.actionId===actionId) {
                    this.db.remove(key);
                }
            }
        });
    }

    async getBatchState(data: string[]): Promise<{
        point: string;
        state: StoredSecretState;
        id?: string;
        amount?: number;
        secret?: string;
        actionId?: string
    }[]> {
        const keys = data.map(key => Buffer.from(key, "hex"));
        const result = await this.db.getMany(keys);
        return result.map((value, i) => {
            const key = data[i];
            if(value==null) return {
                point: key,
                state: StoredSecretState.UNSPENT
            };
            return {
                point: key,
                state: value.locked ? StoredSecretState.LOCKED : StoredSecretState.SPENT,
                id: value.id,
                amount: value.amount,
                secret: value.secret,
                actionId: value.actionId
            };
        });
    }

}