import {Keyset} from "../nut02/Keyset";
import {isSwapRequest, SwapRequest} from "./types/SwapRequest";
import {SwapResponse} from "./types/SwapResponse";
import {IField} from "../interfaces/crypto/IField";
import {Proof} from "../nut00/types/Proof";
import {NutError, NutErrorType} from "../nut00/types/NutError";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {BlindSignature} from "../nut00/types/BlindSignature";
import {IObjectStorage} from "../interfaces/storage/IObjectStorage";
import {SavedTokenSwap, SavedTokenSwapState} from "./persistent/SavedTokenSwap";
import {ITokenService} from "../interfaces/ITokenService";

class TokenSwap extends ITokenService {

    swapStorage: IObjectStorage<SavedTokenSwap>;

    constructor(keysets: Keyset<any, any>[], secretStorage: ISecretStorage, swapStorage: IObjectStorage<SavedTokenSwap>) {
        super(keysets, secretStorage);
        this.swapStorage = swapStorage;
    }

    checkSwapRequest(req: SwapRequest): boolean {
        return isSwapRequest(req, this.keysetFields);
    }

    private hasCorrectAmountBalance(swap: SwapRequest, sortedInputs: {[keysetId: string]: Proof[]}) {
        const totalInputs: number = swap.inputs.reduce((initial, proof) => initial + proof.amount, 0);
        const totalOutputs: number = swap.outputs.reduce((initial, message) => initial + message.amount, 0);
        //Calculate the fees
        let totalFees: number = 0;
        let smallestDenomination: number = null;
        let unit: string = null;
        for(let keysetId in sortedInputs) {
            const numInputs = sortedInputs[keysetId].length;
            const keyset = this.keysets[keysetId];

            //Check the units of inputs & outputs
            if(unit==null) unit = keyset.unit;
            if(keyset.unit!==unit) return false;
            totalFees += Math.round(numInputs*keyset.getInputFeePpk());
            smallestDenomination = smallestDenomination==null ?
                keyset.getSmallestDenomination() :
                Math.min(smallestDenomination, keyset.getSmallestDenomination());
        }
        const roundedFee: number = Math.ceil(totalFees/Math.round(1000*smallestDenomination)) * smallestDenomination;

        return totalInputs>=totalOutputs+roundedFee;
    }

    private async _swap(savedSwap: SavedTokenSwap): Promise<BlindSignature[]> {
        const req = savedSwap.getRequest();
        const actionId = savedSwap.getId();

        //1. Sort the proofs by id
        const proofs: {[keysetId: string]: Proof[]} = this.sortInputsByKeysetId(req.inputs);

        //2. Sort the blinded messages by id
        const blindedMessages: {[keysetId: string]: {index: number, msg: BlindedMessage}[]} = this.sortOutputsByKeysetId(req.outputs);

        //3. Check the amounts
        if(!this.hasCorrectAmountBalance(req, proofs)) throw new NutError(NutErrorType.INSUFFICIENT_INPUTS, "Not enough inputs");

        //4. Check if outputs use active keysets
        if(!this.hasOnlyActiveKeysets(blindedMessages))
            throw new NutError(NutErrorType.INACTIVE_OUTPUT_KEYSET, "Output uses inactive keyset");

        //5. Check if input proofs are valid
        if(!this.verifyInputProofs(proofs))
            throw new NutError(NutErrorType.PROOF_VERIFY_FAIL, "Input proof verification failed");

        //6. Check if inputs are already spent
        savedSwap.setState(SavedTokenSwapState.LOCKING_INPUTS);
        await this.swapStorage.save(savedSwap);

        if(await this.secretStorage.hasAnyOfBatchAndLock(req.inputs, actionId)) {
            await this.swapStorage.remove(actionId);
            throw new NutError(NutErrorType.SECRET_ALREADY_SPENT, "Input secret already spent");
        }

        savedSwap.setState(SavedTokenSwapState.INPUTS_LOCKED);
        await this.swapStorage.save(savedSwap);

        //7. Set the proofs as spent
        try {
            await this.secretStorage.addBatch(req.inputs, actionId);
        } catch (e) {
            await this.secretStorage.unlockBatch(req.inputs, actionId);
            await this.swapStorage.remove(actionId);
            throw e;
        }

        savedSwap.setState(SavedTokenSwapState.INPUTS_SPENT);
        await this.swapStorage.save(savedSwap);

        //8. Sign the outputs
        const blindSignatures: BlindSignature[] = await this.signBlindedMessages(blindedMessages);

        await this.swapStorage.remove(actionId);

        return blindSignatures;
    }

    async start(): Promise<void> {
        const savedSwaps = await this.swapStorage.getAll();
        for(let swap of savedSwaps) {
            const actionId = swap.getId();
            if(swap.getState()===SavedTokenSwapState.LOCKING_INPUTS) {
                //Some inputs might already be marked as locked, try to unlock them all
                await this.secretStorage.unlockTryBatch(swap.getRequest().inputs, actionId);
            }
            if(swap.getState()===SavedTokenSwapState.INPUTS_LOCKED) {
                //Some inputs might already be marked as spent, try to remove all (including the ones that are only locked)
                await this.secretStorage.removeTryBatch(swap.getRequest().inputs, actionId);
            }
            if(swap.getState()===SavedTokenSwapState.INPUTS_SPENT) {
                //Inputs are already spent at this point & some outputs might already be signed, it is more secure to
                // continue the signing process here and let the user get the signatures later via NUT-09
                const blindedMessages: {[keysetId: string]: {index: number, msg: BlindedMessage}[]} = this.sortOutputsByKeysetId(swap.getRequest().outputs);
                const blindSignatures: BlindSignature[] = await this.signBlindedMessages(blindedMessages);
            }
            await this.swapStorage.remove(actionId);
        }
    }

    async swap(req: SwapRequest): Promise<SwapResponse> {
        const savedSwap = new SavedTokenSwap(req);

        const signatures = await this._swap(savedSwap);

        return {
            signatures
        };
    }

}