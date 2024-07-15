import {Proof} from "../../../nut00/types/Proof";
import {NUT08SavedTokenMelt} from "../../persistent/NUT08SavedTokenMelt";
import {SavedTokenMeltState} from "../../../nut05/persistent/SavedTokenMelt";
import {BlindedMessage} from "../../../nut00/types/BlindedMessage";


export class SavedBolt11TokenMelt extends NUT08SavedTokenMelt {

    pr: string;
    maxFee: number;

    constructor(
        pr: string,
        maxFee: number,
        amount: number,
        feeReserve: number,
        unit: string,
        expiry: number,
        outputs?: BlindedMessage[],
        id?: string,
        inputs?: Proof[],
        state?: SavedTokenMeltState
    ) {
        super(amount, feeReserve, unit, expiry, outputs, id, inputs, state);
        this.pr = pr;
        this.maxFee = maxFee;
    }

    serialize(): Buffer {
        return Buffer.from(JSON.stringify({
            id: this.id,
            amount: this.amount,
            feeReserve: this.feeReserve,
            unit: this.unit,
            expiry: this.expiry,
            outputs: this.outputs,
            inputs: this.inputs,
            state: this.state,
            pr: this.pr
        }));
    }

    static deserialize(data: Buffer): SavedBolt11TokenMelt {
        const parsedObj: {
            id: string,
            amount: number,
            feeReserve: number,
            unit: string,
            expiry: number,
            outputs: BlindedMessage[],
            inputs: Proof[],
            state: SavedTokenMeltState,
            pr: string,
            maxFee: number
        } = JSON.parse(data.toString());

        return new SavedBolt11TokenMelt(
            parsedObj.pr,
            parsedObj.maxFee,
            parsedObj.amount,
            parsedObj.feeReserve,
            parsedObj.unit,
            parsedObj.expiry,
            parsedObj.outputs,
            parsedObj.id,
            parsedObj.inputs,
            parsedObj.state
        );
    }

}