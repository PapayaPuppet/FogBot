
import { Guid } from "#domain/Guid.ts";
import { Currency } from "./Currency.ts";
import { CreditEntry, DebitEntry, LedgerEntryProps } from "#domain/LedgerEntry.ts";

type TransactionProps = {
    debitorGuid: Guid
    creditorGuid: Guid
    currency: Currency
    reason: string
}

export class Transaction {
    public readonly creditorGuid: Guid
    public readonly creditEntry: CreditEntry

    public readonly debitorGuid: Guid
    public readonly debitEntry: DebitEntry

    //currently, the ONLY usage is to transfer from a user to their own character, and is initiated by them.
    constructor(props: TransactionProps) {
        this.debitorGuid = props.debitorGuid;
        this.creditorGuid = props.creditorGuid;

        const partialProps: Pick<LedgerEntryProps, 'reason' | 'createdById' | 'createdAt'> = {
            reason: props.reason,
            createdById: props.creditorGuid,
            createdAt: new Date()
        };

        this.debitEntry = new DebitEntry({
            ...partialProps,
            id: Guid.new(),
            currency: new Currency(props.currency.typeId, Math.abs(props.currency.quantity)),
        });

        this.creditEntry = new CreditEntry({
            ...partialProps,
            id: Guid.new(),
            currency: new Currency(props.currency.typeId, Math.abs(props.currency.quantity) * -1),
        });
    }
}