import { Guid } from "#domain/Guid.ts";
import { DomainInvariantError } from "./DomainInvariantException.ts";
import { DeductionLedgerEntry, LedgerEntry } from "./LedgerEntry.ts";

export class Ledger { //turn into interface if behavior implementation differs.
    protected _entries: LedgerEntry[] = [];

    constructor(entries: LedgerEntry[]) {
        this._entries = entries;
    }

    get entries(): LedgerEntry[] {
        return [...this._entries]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    add(entry: LedgerEntry): void {
        const projectedBalance: number = this.getBalance(entry.currency.typeId) + entry.currency.quantity;

        if (projectedBalance < 0 && !(entry instanceof DeductionLedgerEntry))
            throw new DomainInvariantError(`Credit entry cannot create an negative balance.`);
        
        this._entries = [...this._entries, entry];
    }

    getBalance(currencyId: Guid): number {
        return this._entries
            .filter(entry => entry.currency.typeId.equals(currencyId))
            .reduce((sum, entry) => sum + entry.currency.quantity, 0);
    }
}


