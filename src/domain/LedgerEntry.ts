import { LedgerEntryType } from "#schema";
import { Currency } from "./Currency.ts";
import { DomainInvariantError } from "./DomainInvariantException.ts";
import { Guid } from "./Guid.ts";
import { Snowflake } from "./Snowflake.ts";


export interface LedgerEntryProps {
    id: Guid
    currency: Currency
    reason: string
    createdAt: Date,
    createdById: Guid
}

export abstract class LedgerEntry {
    public readonly id: Guid;
    public readonly currency: Currency;
    public readonly createdAt: Date;
    public readonly createdById: Guid;
    public readonly reason: string;

    public abstract readonly type: LedgerEntryType;

    public constructor(props: LedgerEntryProps) {
        this.id = props.id;
        this.currency = props.currency;
        this.reason = props.reason || '';
        this.createdAt = props.createdAt;
        this.createdById = props.createdById;
    }
}

export class CreditEntry extends LedgerEntry {
    public readonly type: LedgerEntryType = LedgerEntryType.Credit;

    public constructor(props: LedgerEntryProps) {
        if (props.currency.quantity > 0)
            throw new DomainInvariantError('A credit ledger entry must have a negative quantity.');

        super(props);
    }
}

export class DebitEntry extends LedgerEntry {
    public readonly type: LedgerEntryType = LedgerEntryType.Debit;

    public constructor(props: LedgerEntryProps) {
        if (props.currency.quantity <= 0)
            throw new DomainInvariantError('A debit ledger entry must have a positive and nonzero quantity.');

        super(props);
    }
}

export class BonusEntry extends LedgerEntry {
    public readonly type: LedgerEntryType = LedgerEntryType.Bonus;

    public constructor(props: LedgerEntryProps) {
        if (props.currency.quantity <= 0)
            throw new DomainInvariantError('A bonus ledger entry must have a positive and nonzero quantity.');

        super(props);
    }
}

interface RoleClaimLedgerEntryProps extends LedgerEntryProps {
    roleId: Snowflake
}

export class RoleClaimEntry extends DebitEntry {
    public readonly roleId: Snowflake;
    public readonly type = LedgerEntryType.RoleClaim;

    public constructor(props: RoleClaimLedgerEntryProps) {
        if (!props.roleId)
            throw new DomainInvariantError("Role claims must have a role id.");

        super(props);
        this.roleId = props.roleId;
        Object.freeze(this);
    }
}

export class DeductionLedgerEntry extends CreditEntry {
    public readonly type = LedgerEntryType.Deduction;

    constructor(props: LedgerEntryProps) {
        super(props);
        Object.freeze(this);
    }
}

export class ExpenditureLedgerEntry extends CreditEntry {
    public readonly type = LedgerEntryType.Expenditure;
    
    constructor(props: LedgerEntryProps) {
        super(props);
        Object.freeze(this);
    }
}