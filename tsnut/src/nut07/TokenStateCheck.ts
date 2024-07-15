import {ITokenService} from "../interfaces/ITokenService";
import {Keyset} from "../nut02/Keyset";
import {ISecretStorage, StoredSecretState} from "../interfaces/storage/ISecretStorage";
import {CheckStateResponse} from "./types/CheckStateResponse";
import {CheckStateRequest, isCheckStateRequest} from "./types/CheckStateRequest";
import {IField} from "../interfaces/crypto/IField";

function stateToString(state: StoredSecretState): "UNSPENT" | "PENDING" | "SPENT" {
    switch (state) {
        case StoredSecretState.LOCKED:
            return "PENDING";
        case StoredSecretState.SPENT:
            return "SPENT";
        case StoredSecretState.UNSPENT:
            return "UNSPENT"
    }
}

export class TokenStateCheck extends ITokenService {

    private readonly fields: IField<any, any>[];

    constructor(keysets: Keyset<any>[], secretStorage: ISecretStorage) {
        super(keysets, secretStorage);
        const fields = new Set<IField<any, any>>();
        for(let keyset of keysets) {
            fields.add(keyset.getField());
        }
        this.fields = Array.from(fields);
    }

    async checkTokens(req: CheckStateRequest): Promise<CheckStateResponse> {
        const returnedState = await this.secretStorage.getBatchState(req.Ys);
        return {
            states: returnedState.map(state => {
                return {
                    Y: state.point,
                    state: stateToString(state.state)
                }
            })
        }
    }

    checkRequest(req: CheckStateRequest): boolean {
        return isCheckStateRequest(req, this.fields);
    }

    start(): Promise<void> {
        return Promise.resolve();
    }

    getSupportedNuts(): { [p: string]: any } {
        return {
            "7": {
                supported: true
            }
        };
    }

}