import { IHexSerializable } from "../serialization/IHexSerializable";
import {IField} from "./IField";
import {IPoint} from "./IPoint";


export interface IScalar<F extends IField<IScalar<F>, IPoint<F>>> extends IHexSerializable {

    getField(): F;

    sign(point: IPoint<F>): IPoint<F>;
    toPoint(): IPoint<F>;

    add(b: IScalar<F>): IScalar<F>;
    mul(b: IScalar<F>): IScalar<F>;

    isMember(): boolean;

}