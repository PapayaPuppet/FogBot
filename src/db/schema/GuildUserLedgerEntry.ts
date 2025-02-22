import { BigIntType, Entity, Enum, ManyToOne, PrimaryKey, Property, rel } from '@mikro-orm/core';
import { LedgerEntryType } from './LedgerEntryType.ts';
import { GuildUser } from './GuildUser.ts';
import { GuildCurrency } from './GuildCurrency.ts';

type GuildUserLedgerEntryProps = {
    id: string,
    guildUserId: string,
    currencyId: string,
    type: LedgerEntryType,
    quantity: number,
    reason: string,
    roleId: string | undefined,
    createdAt: Date | undefined,
    createdByGuildUserId: string 
}

@Entity()
export class GuildUserLedgerEntry {
    @PrimaryKey({ type: 'uuid' })
    id: string

    @ManyToOne()
    guildUser!: GuildUser;

    @Property({ persist: false })
    get guildId(): string {
        return this.guildUser.id;
    }

    @ManyToOne()
    currency!: GuildCurrency;

    @Property({ type: new BigIntType('bigint')})
    forRoleId?: string;

    @Enum({ items: () => LedgerEntryType, nativeEnumName: 'LedgerEntryType' })
    type!: LedgerEntryType;

    @Property()
    quantity!: number;

    @Property()
    reason!: string;

    @Property()
    createdAt!: Date;

    @ManyToOne()
    createdBy!: GuildUser;

    @Property({ persist: false })
    get createdById(): string {
        return this.createdBy.id;
    }
    
    public constructor(props: GuildUserLedgerEntryProps) {
        this.id = props.id;
        this.guildUser = rel(GuildUser, props.guildUserId);
        this.currency = rel(GuildCurrency, props.currencyId);
        this.type = props.type;
        this.quantity = props.quantity;
        this.forRoleId = props.roleId;
        this.reason = props.reason;
        this.createdAt = props.createdAt || new Date();
        this.createdBy = rel(GuildUser, props.createdByGuildUserId);
    }
}