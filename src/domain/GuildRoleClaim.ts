import { Currency } from "./Currency.ts"
import { Guid } from './Guid.ts'

export class GuildRoleClaim {
    readonly id: Guid;
    public currency: Currency;

    constructor(id: Guid, currency: Currency) {
        this.id = id;
        this.currency = currency;
    }
}