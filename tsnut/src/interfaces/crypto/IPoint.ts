import {IField} from "./IField";
import { IHexSerializable } from "../serialization/IHexSerializable";
import {IScalar} from "./IScalar";

export interface IPoint<F extends IField<IScalar<F>, IPoint<F>>> extends IHexSerializable {

    getField(): F;

    add(b: IPoint<F>): IPoint<F>
    mul(s: IScalar<F>): IPoint<F>;

    equals(b: IPoint<F>): boolean;

    isMember(): boolean;

}
