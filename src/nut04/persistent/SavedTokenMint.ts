import {IBinarySerializable} from "../../interfaces/serialization/IBinarySerializable";
import {BlindedMessage} from "../../nut00/types/BlindedMessage";

export abstract class SavedTokenMint implements IBinarySerializable {

    amount: number;
    unit: string;
    paid: boolean;
    outputs: BlindedMessage[];

    constructor(amount: number, unit: string, paid?: boolean, outputs?: BlindedMessage[]) {
        this.amount = amount;
        this.unit = unit;
        this.outputs = outputs;
        this.paid = paid==null ? false : paid;
    }

    abstract getId(): string;

    serialize(): Buffer {
        return Buffer.from(JSON.stringify({
            amount: this.amount,
            unit: this.unit,
            outputs: this.outputs,
            paid: this.paid
        }));
    }

    static deserialize(data: Buffer): {amount: number, unit: string, paid: boolean, outputs: BlindedMessage[]} {
        return JSON.parse(data.toString());
    }

}