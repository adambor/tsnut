import {SwapRequest} from "../types/SwapRequest";
import {IBinarySerializable} from "../../interfaces/serialization/IBinarySerializable";
import {createHash} from "crypto";

export enum SavedTokenSwapState {
    INIT = 0,
    LOCKING_INPUTS = 1,
    INPUTS_LOCKED = 2,
    INPUTS_SPENT = 3
}

const prefix = "SWAP";

export class SavedTokenSwap implements IBinarySerializable {

    private request: SwapRequest;
    private state: SavedTokenSwapState = SavedTokenSwapState.INIT;

    constructor(request: SwapRequest, state?: SavedTokenSwapState) {
        this.request = request;
        if(state!=null) this.state = state;
    }

    getRequest(): SwapRequest {
        return this.request;
    }

    getState(): SavedTokenSwapState {
        return this.state;
    }

    setState(state: SavedTokenSwapState): void {
        this.state = state;
    }

    getId(): string {
        return createHash("sha256").update(prefix+JSON.stringify(this.request)).digest().toString("hex");
    }

    serialize(): Buffer {
        return Buffer.from(JSON.stringify({
            state: this.state,
            request: this.request
        }));
    }

    static deserialize(data: Buffer): SavedTokenSwap {
        const parsedData: {request: SwapRequest, state: SavedTokenSwapState} = JSON.parse(data.toString());
        return new SavedTokenSwap(parsedData.request, parsedData.state);
    }

}