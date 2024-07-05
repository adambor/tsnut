import {IObjectStorage} from "../interfaces/storage/IObjectStorage";
import {Keyset} from "../nut02/Keyset";
import {SavedTokenMint} from "./persistent/SavedTokenMint";
import {ITokenService} from "../interfaces/ITokenService";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {NutError, NutErrorType} from "../nut00/types/NutError";
import {MintQuoteRequest} from "./types/MintQuoteRequest";
import {MintQuoteResponse} from "./types/MintQuoteResponse";
import {MintRequest} from "./types/MintRequest";
import {MintResponse} from "./types/MintResponse";
import {ILockableObjectStorage} from "../interfaces/storage/ILockableObjectStorage";
import {IUnitConverter} from "../interfaces/units/IUnitConverter";

export abstract class TokenMint<
    T extends SavedTokenMint,
    ReqQuote extends MintQuoteRequest,
    ResQuote extends MintQuoteResponse
> extends ITokenService {

    mintStorage: ILockableObjectStorage<T>;
    unitConverter: IUnitConverter;

    constructor(
        keysets: Keyset<any, any>[],
        secretStorage: ISecretStorage,
        mintStorage: ILockableObjectStorage<T>,
        unitConverter: IUnitConverter
    ) {
        super(keysets, secretStorage);
        this.mintStorage = mintStorage;
        this.unitConverter = unitConverter;
    }

    private hasCorrectMintAmount(amount: number, unit: string, outputs: {[keysetId: string]: {index: number, msg: BlindedMessage}[]}) {
        let totalOutputs: number = 0;

        for(let keysetId in outputs) {
            const keyset = this.keysets[keysetId];
            //Check the units of outputs
            if(keyset.unit!==unit) return false;
            totalOutputs += outputs[keysetId].reduce((initial, message) => initial + message.msg.amount, 0);
        }

        return amount>=totalOutputs;
    }

    protected checkAmountAndKeysets(amount: number, unit: string, sortedOutputs: {[keysetId: string]: {index: number, msg: BlindedMessage}[]}): void {
        //1. Check if the amount & unit is correct
        if(!this.hasCorrectMintAmount(amount, unit, sortedOutputs))
            throw new NutError(NutErrorType.INVALID_TOTAL_OUTPUT, "Invalid total output amount");

        //2. Check if outputs use active keysets
        if(!this.hasOnlyActiveKeysets(sortedOutputs))
            throw new NutError(NutErrorType.INACTIVE_OUTPUT_KEYSET, "Output uses inactive keyset");
    }

    abstract mintQuote(request: ReqQuote): Promise<ResQuote>;

    abstract getQuote(quote: string): Promise<ResQuote>;

    protected async _mint(request: MintRequest, savedMintResp: {obj: T, lockId: string}): Promise<MintResponse> {
        const actionId = request.quote;

        //1. Check if mint quote exists
        if(savedMintResp==null) throw new NutError(NutErrorType.QUOTE_NOT_FOUND, "Quote not found!");

        //2. Check if quote is locked
        const lockId = savedMintResp.lockId;
        if(lockId==null) throw new NutError(NutErrorType.QUOTE_ALREADY_CLAIMING, "Quote already being claimed");

        //3. Check if mint quote is paid
        const savedMint = savedMintResp.obj;
        if(!savedMint.paid) {
            await this.mintStorage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.QUOTE_NOT_PAID, "Quote not paid yet!");
        }

        //4. Check if quote already has outputs set
        if(savedMint.outputs!=null) {
            await this.mintStorage.unlock(actionId, lockId);
            throw new NutError(NutErrorType.QUOTE_ALREADY_CLAIMED, "Quote already claimed");
        }

        //5. Sort the outputs
        const sortedOutputs = this.sortOutputsByKeysetId(request.outputs);

        //6. Check if outputs are valid
        try {
            this.checkAmountAndKeysets(savedMint.amount, savedMint.unit, sortedOutputs);
        } catch (e) {
            await this.mintStorage.unlock(actionId, lockId);
            throw e;
        }

        //7. Save outputs
        savedMint.outputs = request.outputs;
        await this.mintStorage.saveAndUnlock(savedMint, lockId);

        //8. Sign outputs
        const signatures = await this.signBlindedMessages(sortedOutputs);

        //9. Remove from mint storage
        await this.mintStorage.remove(actionId);

        return {
            signatures
        };
    }

    async mint(request: MintRequest): Promise<MintResponse> {
        const actionId = request.quote;
        const savedMintResp: {obj: T, lockId: string} = await this.mintStorage.getAndLock(actionId, 60);
        return await this._mint(request, savedMintResp);
    }

}