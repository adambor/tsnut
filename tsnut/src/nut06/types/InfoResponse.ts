
export type InfoContact = {
    method: "email" | "twitter" | "nostr",
    info: string
};

export type InfoResponse = {
    name: string,
    pubkey: string,
    version: string,
    description: string,
    description_long: string,
    contact: InfoContact[],
    motd: string,
    nuts: {[nutId: string]: any}
};
