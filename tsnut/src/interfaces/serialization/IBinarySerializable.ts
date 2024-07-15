

export interface IBinarySerializable {

    getId(): string;
    serialize(): Buffer;

}