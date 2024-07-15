import {IBinarySerializable} from "../../interfaces/serialization/IBinarySerializable";
import {randomBytes} from "crypto";
import { Proof } from "../../nut00/types/Proof";

export enum SavedTokenMeltState {
    //Quote is initiated
    INIT = 0,
    //Inputs are set and are being locked
    LOCKING_INPUTS = 1,
    //All inputs are successfully locked
    INPUTS_LOCKED = 2,
    //Payment has been sent
    PAYING = 3,
    //Inputs are spent - melt request success
    SUCCESS = 4,
    //Inputs are unlocked - melt request failed
    FAIL = 5
}

export abstract class SavedTokenMelt implements IBinarySerializable {

    protected readonly id: string;
    amount: number;
    feeReserve: number;
    unit: string;
    expiry: number;

    inputs: Proof[];

    protected state: SavedTokenMeltState = SavedTokenMeltState.INIT;

    constructor(amount: number, feeReserve: number, unit: string, expiry: number, id?: string, inputs?: Proof[], state?: SavedTokenMeltState) {
        this.amount = amount;
        this.feeReserve = feeReserve;
        this.unit = unit;
        this.expiry = expiry;
        this.id = id || randomBytes(32).toString("hex");
        this.inputs = inputs;
        if(state!=null) this.state = state;
    }

    getState(): SavedTokenMeltState {
        return this.state;
    }

    setState(state: SavedTokenMeltState): void {
        this.state = state;
    }

    getId(): string {
        return this.id;
    }

    abstract serialize(): Buffer;

}