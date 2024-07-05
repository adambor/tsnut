import {IScalar} from "./IScalar";
import {IPoint} from "./IPoint";

export interface IField<S extends IScalar<P>, P extends IPoint<S>> {

    generator(): P;
    hashToField(bytes: Buffer): P;

    hexToScalar(hexString: string): S;
    hexToPoint(hexString: string): P;
    isValidPoint(hexString: string): boolean;
    isValidScalar(hexString: string): boolean;

}
