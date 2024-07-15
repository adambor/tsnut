
export type CheckStateResponse = {
    states: {
        Y: string,
        state: "UNSPENT" | "PENDING" | "SPENT",
        witness?: string
    }[]
};
