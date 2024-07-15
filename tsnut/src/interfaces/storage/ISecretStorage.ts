import {IPoint} from "../crypto/IPoint";

export enum StoredSecretState {
    UNSPENT = 0,
    LOCKED = 1,
    SPENT = 2
}

export type DataWithPoint = { id: string; amount: number; secret: string, point: IPoint<any> };

export interface ISecretStorage {

    /**
     * Adds batch of spent secrets under a specific actionId
     * It requires that all notes are locked under that actionId
     *
     * @param data
     * @param actionId
     */
    addBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Removes batch of secrets (& locked secrets) under a specific actionId
     * This operation skips over secrets that are not spent, or spent under a different actionId
     *
     * @param data
     * @param actionId
     */
    removeTryBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Removes batch of secrets under a specific actionId
     * Fails if any of the secrets are spent under different actionId
     *
     * @param data
     * @param actionId
     */
    removeBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Locks batch of secrets under a specific actionId
     *
     * @param data
     * @param actionId
     */
    lockBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Unlocks batch of secrets under a specific actionId
     * This operation skips over secrets that are not locked, or locked under a different actionId
     *
     * @param data
     * @param actionId
     */
    unlockTryBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Unlocks batch of secrets under a specific actionId
     *
     * @param data
     * @param actionId
     */
    unlockBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<void>;

    /**
     * Checks a batch of secrets
     *
     * @param data
     */
    hasAnyOfBatch(data: {id: string, amount: number, secret: string, point: IPoint<any>}[]): Promise<boolean>;

    /**
     * Checks & locks batch of secrets under a specific actionId
     *
     * @param data
     * @param actionId
     */
    hasAnyOfBatchAndLock(data: {id: string, amount: number, secret: string, point: IPoint<any>}[], actionId: string): Promise<boolean>;

    /**
     * Fetches a batch of secrets
     *
     * @param data
     */
    getBatchState(data: string[]): Promise<{
        point: string,
        state: StoredSecretState,
        id?: string,
        amount?: number,
        secret?: string,
        actionId?: string
    }[]>;

}