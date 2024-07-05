

export interface IUnitConverter {

    convert(amount: number, fromUnit: string, toUnit: string): Promise<number>;

}