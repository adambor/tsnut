import {IBinarySerializable} from "../serialization/IBinarySerializable";
import {IObjectStorage} from "./IObjectStorage";

export interface ILockableObjectStorage<T extends IBinarySerializable> extends IObjectStorage<T> {

    /**
     * Gets & locks specified object
     * returns null if not found
     * returns lockId=null if already locked
     * @param id
     * @param timeout
     */
    getAndLock(id: string, timeout?: number): Promise<{obj: T, lockId: string}>;

    /**
     * Saves & unlocks specified object
     * @param obj
     * @param lockId
     */
    saveAndUnlock(obj: T, lockId: string): Promise<void>;

    /**
     * Lock the specified object, returns lockId (needed for unlock) or null if already locked
     * @param id
     * @param timeout
     */
    lock(id: string, timeout?: number): Promise<string>;

    /**
     * Unlocks the specified object with lockId
     * @param id
     * @param lockId
     */
    unlock(id: string, lockId: string): Promise<void>;

}