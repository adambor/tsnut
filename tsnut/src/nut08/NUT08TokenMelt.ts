import {TokenMelt} from "../nut05/TokenMelt";
import {MeltQuoteRequest} from "../nut05/types/MeltQuoteRequest";
import {MeltQuoteResponse} from "../nut05/types/MeltQuoteResponse";
import {NUT08MeltResponse} from "./types/NUT08MeltResponse";
import {NUT08MeltRequest} from "./types/NUT08MeltRequest";
import {BlindSignature} from "../nut00/types/BlindSignature";
import {BlindedMessage} from "../nut00/types/BlindedMessage";
import {NUT08SavedTokenMelt} from "./persistent/NUT08SavedTokenMelt";

export abstract class NUT08TokenMelt<
    T extends NUT08SavedTokenMelt,
    ReqQuote extends MeltQuoteRequest,
    ResQuote extends MeltQuoteResponse,
    Req extends NUT08MeltRequest,
    Res extends NUT08MeltResponse
> extends TokenMelt<T, ReqQuote, ResQuote, Req, Res> {

    signChangeOutputs(outputs: BlindedMessage[], quotedFee: number, actualFee: number): Promise<BlindSignature[]> {
        if (actualFee >= quotedFee) return Promise.resolve([]);
        let feeDifference = BigInt(quotedFee - actualFee);

        const sortedOutputs = this.sortOutputsByKeysetId(outputs);
        if (!this.hasOnlyActiveKeysets(sortedOutputs)) throw new Error("Contains outputs with inactive keyset!");

        const outputsToSign: { [keysetId: string]: { index: number, msg: BlindedMessage }[] } = {};
        let index = 0;
        for (let output of outputs) {
            const keyset = this.keysets[output.id];
            const denominations = keyset.getDenominations();
            let useDenomination: number = null;
            for (let i = denominations.length - 1; i >= 0; i--) {
                if (BigInt(denominations[i]) < feeDifference) {
                    useDenomination = denominations[i];
                    break;
                }
            }
            if (useDenomination != null) {
                output.amount = useDenomination;
                if (outputsToSign[output.id] == null) outputsToSign[output.id] = [];
                outputsToSign[output.id].push({index, msg: output});
                index++;
                feeDifference-=BigInt(useDenomination);
            }
        }

        return this.signBlindedMessages(outputsToSign);
    }

    protected async _melt(request: Req, savedMeltResp: {obj: T, lockId: string}): Promise<Res> {
        savedMeltResp.obj.outputs = request.outputs;
        return super._melt(request, savedMeltResp);
    }

}