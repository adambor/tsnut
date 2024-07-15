
export const NutErrorType = {
    PROOF_VERIFY_FAIL: 0,
    SECRET_ALREADY_SPENT: 1,
    INACTIVE_OUTPUT_KEYSET: 2,
    INSUFFICIENT_INPUTS: 3,
    INVALID_TOTAL_OUTPUT: 4,

    QUOTE_NOT_FOUND: 5,

    QUOTE_NOT_PAID: 6,
    QUOTE_ALREADY_CLAIMED: 7,
    QUOTE_ALREADY_CLAIMING: 8,

    QUOTE_ADDING_INPUTS: 9,
    QUOTE_INPUTS_SET: 10,
    QUOTE_EXPIRED: 11,

    BOLT11_NOT_PAYABLE: 12
};

export class NutError extends Error {

    code: number;
    detail: string;

    constructor(code: number, detail: string) {
        super(code+": "+detail);

        this.code = code;
        this.detail = detail;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, NutError.prototype);
    }

}
