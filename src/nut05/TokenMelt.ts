import {MeltQuoteRequest} from "./types/MeltQuoteRequest";
import {MeltQuoteResponse} from "./types/MeltQuoteResponse";
import {MeltRequest} from "./types/MeltRequest";
import {MeltResponse} from "./types/MeltResponse";
import {ITokenService} from "../interfaces/ITokenService";
import {ILockableObjectStorage} from "../interfaces/storage/ILockableObjectStorage";
import {IUnitConverter} from "../interfaces/units/IUnitConverter";
import {Keyset} from "../nut02/Keyset";
import {NutError, NutErrorType} from "../nut00/types/NutError";
import {SavedTokenMelt, SavedTokenMeltState} from "./persistent/SavedTokenMelt";
import {Proof} from "../nut00/types/Proof";


export abstract class TokenMelt<
    T extends SavedTokenMelt,
    ReqQuote extends MeltQuoteRequest,
    ResQuote extends MeltQuoteResponse,
    Req extends MeltRequest,
    Res extends MeltResponse
> extends ITokenService {

    meltStorage: ILockableObjectStorage<T>;
    unitConverter: IUnitConverter;
    allowedUnits: Set<string>;
    quoteExpirySeconds: number;

    constructor(
        keysets: Keyset<any, any>[],
        secretStorage: ISecretStorage,
        meltStorage: ILockableObjectStorage<T>,
        quoteExpirySeconds: number,
        unitConverter: IUnitConverter,
        allowedUnits?: Set<string>
    ) {
        super(keysets, secretStorage);
        this.meltStorage = meltStorage;
        this.quoteExpirySeconds = quoteExpirySeconds;
        this.unitConverter = unitConverter;
        if(allowedUnits==null) {
            this.allowedUnits = new Set();
            keysets.forEach(keyset => this.allowedUnits.add(keyset.unit));
        } else {
            this.allowedUnits = allowedUnits;
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

    protected async _melt(request: Req, savedMeltResp: {obj: T, lockId: string}): Promise<Res> {
        const actionId = request.quote;

        //1. Check if mint quote exists
        if(savedMeltResp==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found!");

        //2. Check if quote is locked
        const lockId = savedMeltResp.lockId;
        if(lockId==null) throw new NutError(NutErrorType.QUOTE_ADDING_INPUTS, "Quote already adding inputs");

        //3. Check quote state
        const savedMelt = savedMeltResp.obj;
        if(savedMelt.getState()!=SavedTokenMeltState.INIT) {
            await this.meltStorage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.QUOTE_INPUTS_SET, "Quote inputs are already set");
        }

        //4. Sort the inputs
        const sortedInputs = this.sortInputsByKeysetId(request.inputs);

        //5. Check the amounts
        if(!this.hasCorrectMeltAmount(savedMelt.amount, savedMelt.feeReserve, savedMelt.unit, sortedInputs)) {
            await this.meltStorage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.INSUFFICIENT_INPUTS, "Not enough inputs");
        }

        //6. Check if input proofs are valid
        if(!this.verifyInputProofs(sortedInputs)) {
            await this.meltStorage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.PROOF_VERIFY_FAIL, "Input proof verification failed");
        }

        //7. Check if inputs are already spent
        savedMelt.inputs = request.inputs;
        savedMelt.setState(SavedTokenMeltState.LOCKING_INPUTS);
        await this.meltStorage.save(savedMelt);

        if(await this.secretStorage.hasAnyOfBatchAndLock(request.inputs, actionId)) {
            savedMelt.inputs = null;
            savedMelt.setState(SavedTokenMeltState.INIT);
            await this.meltStorage.saveAndUnlock(savedMelt, lockId);
            throw new NutError(NutErrorType.SECRET_ALREADY_SPENT, "Input secret already spent");
        }

        savedMelt.setState(SavedTokenMeltState.INPUTS_LOCKED);
        await this.meltStorage.save(savedMelt);

        //8. Initiate payment
        try {
            await this.pay(savedMeltResp);
            savedMelt.setState(SavedTokenMeltState.PAYING)
            await this.meltStorage.saveAndUnlock(savedMelt, lockId);
        } catch (e) {
            await this.secretStorage.unlockBatch(request.inputs, actionId);
            savedMelt.inputs = null;
            savedMelt.setState(SavedTokenMeltState.INIT);
            await this.meltStorage.saveAndUnlock(savedMelt, lockId);
            throw e;
        }

        //9. Wait for payment result
        //If this fails we don't actually know if the payment succeeded or not, we should retry in that case
        let resp: Res = await this.waitForPayment(savedMelt);

        if(resp.paid) {
            await this.secretStorage.addBatch(request.inputs, actionId);
        } else {
            await this.secretStorage.unlockBatch(request.inputs, actionId);
        }

        await this.meltStorage.remove(actionId);

        return resp;
    }

    async melt(request: Req): Promise<Res> {
        const actionId = request.quote;
        const savedMintResp: {obj: T, lockId: string} = await this.meltStorage.getAndLock(actionId, 60);
        return await this._melt(request, savedMintResp);
    }

}