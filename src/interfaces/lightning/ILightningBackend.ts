
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

    createInvoice(amount: number, expirySeconds: number): Promise<{pr: string, id: string, expiry: number}>;

    /**
     * Returns status of the LN invoice, or null if invoice was not found
     * @param id
     */
    getInvoiceStatus(id: string): Promise<LightningInvoiceStatus>;

    isValidBolt11Request(pr: string): boolean;
    parseInvoice(pr: string): {id: string, amount: number, expiry: number};

    /**
     * Estimates required fee needed to pay the BOLT11 invoice
     * @param pr
     */
    estimatePaymentFee(pr: string): Promise<number>;

    /**
     * Pays a BOLT11 lightning invoice
     * @param pr
     */
    payInvoice(pr: string): Promise<void>;

    /**
     * Returns status of the LN payment, or null if payment was not found
     * @param id
     */
    getPaymentStatus(id: string): Promise<LightningPaymentStatus>;

    /**
     * Waits for a lightning payment to either succeed or fail
     * Returns a payment pre-image if success or null if failed
     * @param id
     */
    waitForPayment(id: string): Promise<string>;

}