import {IScalar} from "./IScalar";
import {IField} from "./IField";

export interface IPoint<S extends IScalar<this>> extends IHexSerializable {

    getField(): IField<S, this>;

    add(b: IPoint<S>): this;
    sub(b: IPoint<S>): this;
    mul(s: S): this;

    equals(b: IPoint<S>): boolean;

    isMember(): boolean;

}