import {IUnitConverter} from "../interfaces/units/IUnitConverter";

export class DummyUnitConverter implements IUnitConverter {

    convert(amount: number, fromUnit: string, toUnit: string): Promise<number> {
        if(fromUnit!==toUnit) throw new Error("Cannot convert between different units");
        return Promise.resolve(amount);
    }

}