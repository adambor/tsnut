
export enum LightningInvoiceStatus {
    CREATED=0,
    RECEIVED=1,
    SETTLED=2,
    CANCELED=3,
    EXPIRED=4
}

export enum LightningPaymentStatus {
    INITIATED=0,
    SUCCESS=1,
    FAILED=2
}

export interface ILightningBackend {

    getUnit(): string;

    createInvoice(amount: number): Promise<{pr: string, id: string, expiry: number}>;
    getInvoiceStatus(id: string): Promise<LightningInvoiceStatus>;

    parseInvoice(pr: string): {id: string, amount: number, expiry: number};

    payInvoice(pr: string): Promise<void>;
    getPaymentStatus(id: string): Promise<LightningPaymentStatus>;

}