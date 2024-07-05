import {SavedTokenMint} from "../../persistent/SavedTokenMint";
import {BlindedMessage} from "../../../nut00/types/BlindedMessage";
import {randomBytes} from "crypto";


export class SavedBolt11TokenMint extends SavedTokenMint {

    id: string;
    pr: string;

    constructor(pr: string, amount: number, unit: string, id?: string, paid?: boolean, outputs?: BlindedMessage[]) {
        super(amount, unit, paid, outputs);
        this.pr = pr;
        this.id = id || randomBytes(32).toString("hex");
    }

    getId(): string {
        return this.id;
    }

    serialize(): Buffer {
        return Buffer.from(JSON.stringify({
            amount: this.amount,
            unit: this.unit,
            outputs: this.outputs,
            id: this.id,
            pr: this.pr,
            paid: this.paid
        }));
    }

    static deserialize(data: Buffer): SavedBolt11TokenMint {
        const parsedObj: {
            amount: number,
            unit: string,
            outputs: BlindedMessage[],
            id: string,
            pr: string,
            paid: boolean
        } = JSON.parse(data.toString());

        return new SavedBolt11TokenMint(
            parsedObj.pr,
            parsedObj.amount,
            parsedObj.unit,
            parsedObj.id,
            parsedObj.paid,
            parsedObj.outputs
        );
    }

}