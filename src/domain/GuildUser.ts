import { CompositeSpecification } from "./Specification.ts";
import { Currency } from "./Currency.ts";
import { Guid } from "./Guid.ts";
import { BonusEntry, DebitEntry, DeductionLedgerEntry, LedgerEntry, RoleClaimEntry } from "./LedgerEntry.ts";
import { Ledger } from "./Ledger.ts";
import { Snowflake } from "./Snowflake.ts";
import { Transaction } from "./Transaction.ts";



interface GuildUserProps {
    id: Guid
    guildId: Snowflake
    userId: Snowflake
    characterIds: Guid[]
    ledger: Ledger
}

export class GuildUser {
    public readonly id: Guid;
    public readonly guildId: Snowflake; 
    public readonly userId: Snowflake;
    public readonly ownedCharacterIds: Guid[];
    public readonly ledger: Ledger;

    protected constructor(props: GuildUserProps) {
        this.id = props.id;
        this.guildId = props.guildId;
        this.userId = props.userId;
        this.ownedCharacterIds = props.characterIds;
        this.ledger = props.ledger;
    }

    public static create(guildId: Snowflake, userId: Snowflake): GuildUser {
        return new GuildUser({
            id: Guid.new(),
            guildId,
            userId,
            characterIds: [],
            ledger: new Ledger([])
        });
    }

    public static reconstitute(props: GuildUserProps): GuildUser {
        return new GuildUser(props);
    }

    public addCurrency(props: {
        currency: Currency, 
        roleId?: Snowflake,
        reason: string,
        requestorId: Guid
    }): void {
        const entryProps = {
            id: Guid.new(),
            currency: props.currency,
            reason: props.reason,
            createdAt: new Date(),
            createdById: props.requestorId
        };

        if (!!props.roleId) {
            this.ledger.add(new RoleClaimEntry({
                ...entryProps,
                roleId: props.roleId
            }));
        }
        else {
            this.ledger.add(new BonusEntry(entryProps));
        }
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
        }))
    }

    public credit(transaction: Transaction) {
        if (!transaction.creditorGuid.equals(this.id))
            throw new Error('Cannot apply credit operation to guild user. Transaction creditor identity and the user credited must match.');
        else if (!this.ownedCharacterIds.some(id => id.equals(transaction.debitorGuid)))
            throw new Error('Cannot apply credit operation to guild user. Transaction debitor identity is not owned by the user.');

        this.ledger.add(transaction.creditEntry);
    }
}






export class IsPositive extends CompositeSpecification<number> {
    constructor() {
        super()
    }

    public isSatisfiedBy(candidate: number): boolean {
        return candidate >= 0;
    }
}

export class IsNegative extends CompositeSpecification<number> {
    constructor() {
        super()
    }

    public isSatisfiedBy(candidate: number): boolean {
        return candidate < 0;
    }
}


export class IsNonzero extends CompositeSpecification<number> {
  constructor() {
      super()
  }

  public isSatisfiedBy(candidate: number): boolean {
      return candidate != 0;
  }
}