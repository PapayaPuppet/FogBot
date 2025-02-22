import { Currency } from "./Currency.ts";
import { Ledger } from "./Ledger.ts";
import { Guid } from "./Guid.ts";
import { BonusEntry, DebitEntry, DeductionLedgerEntry, ExpenditureLedgerEntry } from "./LedgerEntry.ts";
import { Transaction } from "./Transaction.ts";
import { DomainInvariantError } from "./DomainInvariantException.ts";

type CharacterProps = {
    id: Guid,
    name: string,
    ownerId: Guid,
    ledger: Ledger
}

export class Character {
    public readonly id: Guid;
    public readonly ownerId: Guid;
    public readonly name: string;
    public ledger: Ledger;

    protected constructor(props: CharacterProps) {
        this.id = props.id;
        this.name = props.name,
        this.ledger = props.ledger;
        this.ownerId = props.ownerId;
    }

    public static create(name: string, ownerId: Guid) {
        return new Character({
            id: Guid.new(),
            ownerId: ownerId,
            name,
            ledger: new Ledger([])
        });
    }

    public static reconstitute(props: CharacterProps) {
        return new Character(props);
    }

    public addCurrency(props: { 
        currency: Currency, 
        reason: string, 
        requestorId: Guid
    }): void {
        this.ledger.add(new BonusEntry({
            id: Guid.new(),
            currency: props.currency,
            reason: props.reason,
            createdAt: new Date(),
            createdById: props.requestorId
        }));
    }

    public spendCurrency(props: { 
        currency: Currency, 
        reason: string, 
        requestorId: Guid
    }): void {
        this.ledger.add(new ExpenditureLedgerEntry({
            id: Guid.new(),
            currency: props.currency,
            reason: props.reason,
            createdAt: new Date(),
            createdById: props.requestorId
        }));
    }   
    
    public deductCurrency(props: { 
        currency: Currency, 
        reason: string, 
        requestorId: Guid
    }): void {
        this.ledger.add(new DeductionLedgerEntry({
            id: Guid.new(),
            currency: props.currency,
            reason: props.reason,
            createdAt: new Date(),
            createdById: props.requestorId
        }));
    }
    
    public debit(transaction: Transaction) {
        if (!transaction.debitorGuid.equals(this.id))
            throw new DomainInvariantError('Cannot apply debit operation to character. Transaction debitor identity and the character debited must match.');
        else if (!this.ownerId.equals(transaction.creditorGuid))
            throw new DomainInvariantError('Cannot apply debit operation to character. Transaction creditor identity is not the character owner.');

        this.ledger.add(transaction.debitEntry);
    }
}