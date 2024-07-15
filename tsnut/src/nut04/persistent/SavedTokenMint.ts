import {IBinarySerializable} from "../../interfaces/serialization/IBinarySerializable";
import {BlindedMessage} from "../../nut00/types/BlindedMessage";
import {randomBytes} from "crypto";

export abstract class SavedTokenMint implements IBinarySerializable {

    protected readonly id: string;
    amount: number;
    unit: string;
    paid: boolean;
    outputs: BlindedMessage[];

    constructor(amount: number, unit: string, id?: string, paid?: boolean, outputs?: BlindedMessage[]) {
        this.amount = amount;
        this.unit = unit;
        this.outputs = outputs;
        this.paid = paid==null ? false : paid;
        this.id = id || randomBytes(32).toString("hex");
    }

    getId(): string {
        return this.id;
    }

    abstract serialize(): Buffer;

}