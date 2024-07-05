
export type KeysetResponse = {
    id: string,
    unit: string,
    keys: {
        [amount: number]: string
    }
};

