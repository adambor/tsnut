import {MeltQuoteRequest} from "./types/MeltQuoteRequest";
import {MeltQuoteResponse} from "./types/MeltQuoteResponse";
import {MeltRequest} from "./types/MeltRequest";
import {MeltResponse} from "./types/MeltResponse";
import {NutError, NutErrorType} from "../nut00/types/NutError";
import {SavedTokenMelt, SavedTokenMeltState} from "./persistent/SavedTokenMelt";
import {Proof} from "../nut00/types/Proof";
import {IMintMeltTokenService} from "../interfaces/IMintMeltTokenService";


export abstract class TokenMelt<
    T extends SavedTokenMelt,
    ReqQuote extends MeltQuoteRequest,
    ResQuote extends MeltQuoteResponse,
    Req extends MeltRequest,
    Res extends MeltResponse
> extends IMintMeltTokenService<T> {

    async start(): Promise<void> {
        const savedMelts = await this.storage.getAll();
        for(let savedMelt of savedMelts) {
            const actionId = savedMelt.getId();
            if(savedMelt.getState()===SavedTokenMeltState.LOCKING_INPUTS) {
                //Some inputs might already be marked as locked, try to unlock them all
                await this.secretStorage.unlockTryBatch(savedMelt.inputs, actionId);
            }
            if(savedMelt.getState()===SavedTokenMeltState.INPUTS_LOCKED) {
                //Payment might've already been attempted, let's just keep rolling here
                const savedMeltResp = await this.storage.getAndLock(actionId, 60);
                await this.intiatePayment(savedMeltResp);
            }
            if(savedMelt.getState()===SavedTokenMeltState.PAYING) {
                //Subscribe to payment result
                this.subscribeToPaymentAndFinish(savedMelt);
            }
        }
    }

    private hasCorrectMeltAmount(amount: number, feeReserve: number, unit: string, inputs: {[keysetId: string]: Proof[]}) {
        let totalInputs: number = 0;

        for(let keysetId in inputs) {
            const keyset = this.keysets[keysetId];
            //Check the units of outputs
            if(keyset.unit!==unit) return false;
            totalInputs += inputs[keysetId].reduce((initial, message) => initial + message.amount, 0);
        }

        return totalInputs>=amount+feeReserve;
    }

    abstract checkMeltQuoteRequest(req: ReqQuote): boolean;

    abstract checkMeltRequest(req: Req): boolean;

    abstract meltQuote(request: ReqQuote): Promise<ResQuote>;

    abstract getQuote(quote: string): Promise<ResQuote>;

    /**
     * Initiates a payment corresponding to a melt request, this function should not block till the tx is confirmed
     * This function should also check if the payment was sent already, and in that case do nothing (not throw an error)
     * @param savedMeltResp
     * @protected
     */
    protected abstract pay(savedMeltResp: {obj: T, lockId: string}): Promise<void>;

    /**
     * Waits for a payment to either succeed or fail
     * if the payment is already success/failed this function should return immediately
     * @param savedMelt
     * @protected
     */
    protected abstract waitForPayment(savedMelt: T): Promise<Res>;

    private async intiatePayment(savedMeltResp: {obj: T, lockId: string}) {
        const lockId = savedMeltResp.lockId;
        const savedMelt = savedMeltResp.obj;
        const actionId = savedMelt.getId();
        try {
            await this.pay(savedMeltResp);
            savedMelt.setState(SavedTokenMeltState.PAYING)
            await this.storage.saveAndUnlock(savedMelt, lockId);
        } catch (e) {
            await this.secretStorage.unlockBatch(savedMelt.inputs, actionId);
            savedMelt.inputs = null;
            savedMelt.setState(SavedTokenMeltState.INIT);
            await this.storage.saveAndUnlock(savedMelt, lockId);
            throw e;
        }
    }

    private async subscribeToPaymentAndFinish(savedMelt: T): Promise<Res> {
        const actionId = savedMelt.getId();
        //If this fails we don't actually know if the payment succeeded or not, we should retry in that case
        let resp: Res = await this.waitForPayment(savedMelt);

        if(resp.paid) {
            await this.secretStorage.addBatch(savedMelt.inputs, actionId);
            savedMelt.setState(SavedTokenMeltState.SUCCESS);
        } else {
            await this.secretStorage.unlockBatch(savedMelt.inputs, actionId);
            savedMelt.setState(SavedTokenMeltState.FAIL);
        }

        await this.storage.remove(actionId);

        return resp;
    }

    protected async _melt(request: Req, savedMeltResp: {obj: T, lockId: string}): Promise<Res> {
        const actionId = request.quote;

        //1. Check if mint quote exists
        if(savedMeltResp==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found!");

        //2. Check if quote is locked
        const lockId = savedMeltResp.lockId;
        if(lockId==null) throw new NutError(NutErrorType.QUOTE_ADDING_INPUTS, "Quote already adding inputs");

        //3. Check quote state
        const savedMelt = savedMeltResp.obj;
        if(savedMelt.expiry<Math.floor(Date.now()/1000)) {
            await this.storage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.QUOTE_EXPIRED, "Quote expired");
        }
        if(savedMelt.getState()!=SavedTokenMeltState.INIT) {
            await this.storage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.QUOTE_INPUTS_SET, "Quote inputs are already set");
        }

        //4. Sort the inputs
        const sortedInputs = this.sortInputsByKeysetId(request.inputs);

        //5. Check the amounts
        if(!this.hasCorrectMeltAmount(savedMelt.amount, savedMelt.feeReserve, savedMelt.unit, sortedInputs)) {
            await this.storage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.INSUFFICIENT_INPUTS, "Not enough inputs");
        }

        //6. Check if input proofs are valid
        if(!this.verifyInputProofs(sortedInputs)) {
            await this.storage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.PROOF_VERIFY_FAIL, "Input proof verification failed");
        }

        //7. Check if inputs are already spent
        savedMelt.inputs = request.inputs;
        savedMelt.setState(SavedTokenMeltState.LOCKING_INPUTS);
        await this.storage.save(savedMelt);

        if(await this.secretStorage.hasAnyOfBatchAndLock(request.inputs, actionId)) {
            savedMelt.inputs = null;
            savedMelt.setState(SavedTokenMeltState.INIT);
            await this.storage.saveAndUnlock(savedMelt, lockId);
            throw new NutError(NutErrorType.SECRET_ALREADY_SPENT, "Input secret already spent");
        }

        savedMelt.setState(SavedTokenMeltState.INPUTS_LOCKED);
        await this.storage.save(savedMelt);

        //8. Initiate payment
        await this.intiatePayment(savedMeltResp);

        //9. Wait for payment result
        return await this.subscribeToPaymentAndFinish(savedMelt);
    }

    async melt(request: Req): Promise<Res> {
        const actionId = request.quote;
        const savedMintResp: {obj: T, lockId: string} = await this.storage.getAndLock(actionId, 60);
        return await this._melt(request, savedMintResp);
    }

}