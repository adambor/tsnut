import {SavedTokenMelt, SavedTokenMeltState} from "../../nut05/persistent/SavedTokenMelt";
import {BlindedMessage} from "../../nut00/types/BlindedMessage";
import {Proof} from "../../nut00/types/Proof";

export abstract class NUT08SavedTokenMelt extends SavedTokenMelt {

    outputs: BlindedMessage[];

    constructor(amount: number, feeReserve: number, unit: string, expiry: number, outputs: BlindedMessage[], id?: string, inputs?: Proof[], state?: SavedTokenMeltState) {
        super(amount, feeReserve, unit, expiry, id, inputs, state);
        this.outputs = outputs;
    }

}