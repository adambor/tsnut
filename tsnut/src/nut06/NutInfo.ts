import {InfoContact, InfoResponse} from "./types/InfoResponse";
import {ITokenService} from "../interfaces/ITokenService";
import {Keyset} from "../nut02/Keyset";


export class NutInfo {

    name: string;
    pubkey: string;
    version: string;
    description: string;
    descriptionLong: string;
    contact: InfoContact[];
    motd: string;

    services: ITokenService[];

    nuts: {[nutId: string]: any};

    constructor(
        name: string,
        pubkey: string,
        version: string,
        description: string,
        descriptionLong: string,
        contact: InfoContact[],
        motd: string,
        services: ITokenService[],
        keysets: Keyset<any>[]
    ) {
        this.name = name;
        this.pubkey = pubkey;
        this.version = version;
        this.description = description;
        this.descriptionLong = descriptionLong;
        this.contact = contact;
        this.motd = motd;
        this.services = services;

        this.nuts = {
            "4": {methods: [], disabled: true},
            "5": {methods: [], disabled: true}
        };

        this.services.forEach(service => {
            const supportedNuts: {[nutId: string]: any} = service.getSupportedNuts();
            for(let nutId in supportedNuts) {
                if(nutId==="4" || nutId==="5") {
                    const nutInfo: {methods: {method: string, unit: string, min_amount: number, max_amount: number}[], disabled: boolean} = supportedNuts[nutId];
                    const existingNutInfo: {methods: {method: string, unit: string, min_amount: number, max_amount: number}[], disabled: boolean} = this.nuts[nutId];
                    if(!nutInfo.disabled) {
                        nutInfo.methods.forEach(method => existingNutInfo.methods.push(method));
                        existingNutInfo.disabled = false;
                    }
                } else {
                    this.nuts[nutId] = supportedNuts[nutId];
                }
            }
        });

        let supportsDLEQ = true;
        keysets.forEach(keyset => {
            if(keyset.isActive() && !keyset.hasDLEQSupport()) supportsDLEQ = false;
        });

        if(supportsDLEQ) this.nuts["12"] = {supported: true};

    }

    getResponse(): InfoResponse {
        return {
            name: this.name,
            pubkey: this.pubkey,
            version: this.version,
            description: this.description,
            description_long: this.descriptionLong,
            contact: this.contact,
            motd: this.motd,
            nuts: this.nuts
        }
    }

}