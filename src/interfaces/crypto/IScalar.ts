import {IPoint} from "./IPoint";
import {IField} from "./IField";


export interface IScalar<P extends IPoint<this>> extends IHexSerializable {

    getField(): IField<this, P>;

    sign(point: P): P;

}