import {IBinarySerializable, ILockableObjectStorage} from "tsnut";
import {open, RootDatabase} from "lmdb";
import {randomBytes} from "crypto";

function parseLock(data: Buffer): {expireAt: number, lockId: string} {
    return {
        expireAt: data.readUint32LE(0),
        lockId: data.subarray(4).toString("hex")
    };
}

function serializeLock(lockId: Buffer, timeout?: number) {
    const timeoutBuffer = Buffer.alloc(4);
    timeoutBuffer.writeUint32LE(timeout==null ? 2**32 : Math.floor(Date.now()/1000)+timeout);
    return Buffer.concat([timeoutBuffer, lockId]);
}

export class LMDBLockableObjectStorage<T extends IBinarySerializable> implements ILockableObjectStorage<T> {

    private readonly db: RootDatabase<Buffer, Buffer>;
    private readonly deserializer: (data: Buffer) => T;

    constructor(directory: string, deserializer: (data: Buffer) => T) {
        this.db = open<Buffer, Buffer>({
            path: directory,
            compression: true,
            keyEncoding: "binary"
        });
        this.deserializer = deserializer;
    }

    get(id: string): Promise<T> {
        return Promise.resolve(this.deserializer(this.db.get(Buffer.from("S-"+id))));
    }

    getAll(): Promise<T[]> {
        const arr: T[] = [];
        for (let { key, value } of this.db.getRange()) {
            if(key.subarray(0, 2).toString()==="S-") arr.push(this.deserializer(value));
        }
        return Promise.resolve(arr);
    }

    async getAndLock(id: string, timeout?: number): Promise<{ obj: T; lockId: string }> {
        const lockId = randomBytes(32);
        return this.db.transaction<{obj: T, lockId: string}>(() => {
            const val = this.db.get(Buffer.from("S-"+id));
            if(val==null) return null;
            const obj = this.deserializer(val);

            const lockedVal = this.db.get(Buffer.from("L-"+id));
            if(lockedVal!=null) {
                const parsedLock = parseLock(lockedVal);
                if(parsedLock.expireAt>Math.floor(Date.now()/1000)) return {obj, lockId: null};
            }

            this.db.put(Buffer.from("L-"+id), serializeLock(lockId, timeout));

            return {
                obj,
                lockId: lockId.toString("hex")
            };
        });
    }

    lock(id: string, timeout?: number): Promise<string> {
        const lockId = randomBytes(32);
        return this.db.transaction<string>(() => {
            const lockedVal = this.db.get(Buffer.from("L-"+id));
            if(lockedVal!=null) {
                const parsedLock = parseLock(lockedVal);
                if(parsedLock.expireAt>Math.floor(Date.now()/1000)) return null;
            }

            this.db.put(Buffer.from("L-"+id), serializeLock(lockId, timeout));

            return lockId.toString("hex");
        });
    }

    async remove(id: string): Promise<boolean> {
        const success = await this.db.remove(Buffer.from("S-"+id));
        await this.db.remove(Buffer.from("L-"+id));
        return success;
    }

    save(obj: T): Promise<void> {
        return this.db.put(Buffer.from("S-"+obj.getId()), obj.serialize())
            .then(success => {
                if(!success) throw new Error("Failed to save the object");
            });
    }

    async saveAndUnlock(obj: T, lockId: string): Promise<void> {
        const putSuccess = await this.db.put(Buffer.from("S-"+obj.getId()), obj.serialize());
        if(!putSuccess) throw new Error("Failed to save the object");

        const id = obj.getId();

        return this.db.transaction<void>(() => {
            const lockedVal = this.db.get(Buffer.from("L-"+id));
            if(lockedVal!=null) {
                const parsedLock = parseLock(lockedVal);
                if(parsedLock.lockId!==lockId) return;
            }
            this.db.remove(Buffer.from("L-"+id));
        });
    }

    unlock(id: string, lockId: string): Promise<void> {
        return this.db.transaction<void>(() => {
            const lockedVal = this.db.get(Buffer.from("L-"+id));
            if(lockedVal!=null) {
                const parsedLock = parseLock(lockedVal);
                if(parsedLock.lockId!==lockId) return;
            }
            this.db.remove(Buffer.from("L-"+id));
        });
    }

}