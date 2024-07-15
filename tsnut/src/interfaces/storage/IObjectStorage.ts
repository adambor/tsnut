import {IBinarySerializable} from "../serialization/IBinarySerializable";


export interface IObjectStorage<T extends IBinarySerializable> {

    /**
     * Save or update object obj
     * @param obj
     */
    save(obj: T): Promise<void>;

    /**
     * Remove the object, true if successful, false if object didn't exist
     * @param id
     */
    remove(id: string): Promise<boolean>;

    /**
     * Get the object by its ID
     * @param id
     */
    get(id: string): Promise<T>;

    /**
     * Get all stored objects
     */
    getAll(): Promise<T[]>;

}