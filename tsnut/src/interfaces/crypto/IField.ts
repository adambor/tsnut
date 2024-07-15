import {IScalar} from "./IScalar";
import {IPoint} from "./IPoint";

export interface IField<S extends IScalar<IField<S, P>>, P extends IPoint<IField<S, P>>> {

    hashToPoint(bytes: Buffer): P;
    hashPointsToScalar(points: P[]): S;

    randomScalar(): S;

    hexToScalar(hexString: string): S;
    hexToPoint(hexString: string): P;
    isValidPoint(hexString: string): boolean;
    isValidScalar(hexString: string): boolean;

}
