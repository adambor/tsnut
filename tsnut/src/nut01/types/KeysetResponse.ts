
export type KeysetResponse = {
    id: string,
    unit: string,
    keys: {
        [amount: string]: string
    }
};

