import {InfoContact} from "./types/InfoResponse";
import {ITokenService} from "../interfaces/ITokenService";


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
        services: ITokenService[]
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
    }


}