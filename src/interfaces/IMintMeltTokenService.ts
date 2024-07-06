import {ITokenService} from "./ITokenService";
import {ILockableObjectStorage} from "./storage/ILockableObjectStorage";
import {IUnitConverter} from "./units/IUnitConverter";
import {Keyset} from "../nut02/Keyset";
import {IBinarySerializable} from "./serialization/IBinarySerializable";


export abstract class IMintMeltTokenService<T extends IBinarySerializable> extends ITokenService {

    storage: ILockableObjectStorage<T>;
    unitConverter: IUnitConverter;
    allowedUnits: Set<string>;
    unitLimits: {[unit: string]: {min: number, max: number}};
    quoteExpirySeconds: number;

    constructor(
        keysets: Keyset<any, any>[],
        secretStorage: ISecretStorage,
        storage: ILockableObjectStorage<T>,
        quoteExpirySeconds: number,
        unitConverter: IUnitConverter,
        unitLimits?: {[unit: string]: {min: number, max: number}}
    ) {
        super(keysets, secretStorage);
        this.storage = storage;
        this.quoteExpirySeconds = quoteExpirySeconds;
        this.unitConverter = unitConverter;
        if(unitLimits==null) {
            this.unitLimits = {};
            keysets.forEach(keyset => this.unitLimits[keyset.unit] = {min: 0, max: 0xFFFFFFFF});
        } else {
            this.unitLimits = unitLimits;
        }
        this.allowedUnits = new Set<string>(Object.keys(this.unitLimits));
    }

}