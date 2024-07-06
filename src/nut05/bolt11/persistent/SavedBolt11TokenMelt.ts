import {randomBytes} from "crypto";
import {SavedTokenMelt, SavedTokenMeltState} from "../../persistent/SavedTokenMelt";
import {Proof} from "../../../nut00/types/Proof";


export class SavedBolt11TokenMelt extends SavedTokenMelt {

    pr: string;

    constructor(pr: string, amount: number, feeReserve: number, unit: string, expiry: number, id?: string, inputs?: Proof[], state?: SavedTokenMeltState) {
        super(amount, feeReserve, unit, expiry, id, inputs, state);
        this.pr = pr;
    }

    serialize(): Buffer {
        return Buffer.from(JSON.stringify({
            id: this.id,
            amount: this.amount,
            feeReserve: this.feeReserve,
            unit: this.unit,
            expiry: this.expiry,
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
            inputs: Proof[],
            state: SavedTokenMeltState,
            pr: string
        } = JSON.parse(data.toString());

        return new SavedBolt11TokenMelt(
            parsedObj.pr,
            parsedObj.amount,
            parsedObj.feeReserve,
            parsedObj.unit,
            parsedObj.expiry,
            parsedObj.id,
            parsedObj.inputs,
            parsedObj.state
        );
    }

}