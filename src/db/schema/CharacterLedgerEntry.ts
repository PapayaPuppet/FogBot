import { Entity, Enum, ManyToOne, PrimaryKey, Property, rel } from '@mikro-orm/core';
import { Character } from './Character.ts';
import { LedgerEntryType } from './LedgerEntryType.ts';
import { GuildUser } from './GuildUser.ts';
import { GuildCurrency } from './GuildCurrency.ts';

type CharacterLedgerEntryProps = {
    id: string,
    characterId: string,
    currencyId: string,
    type: LedgerEntryType,
    quantity: number,
    reason: string,
    createdAt: Date,
    createdByGuildUserId: string 
}

@Entity()
export class CharacterLedgerEntry {
    @PrimaryKey({ type: 'uuid' })
    id: string

    @ManyToOne()
    character!: Character;

    @ManyToOne()
    currency!: GuildCurrency;

    @Enum({ items: () => LedgerEntryType, nativeEnumName: 'LedgerEntryType' })
    type!: LedgerEntryType;

    @Property()
    quantity!: number;

    @Property()
    reason!: string;

    @Property({ onCreate: () => new Date()})
    createdAt!: Date;

    @ManyToOne()
    createdBy!: GuildUser;

    @Property({ persist: false })
    get createdById(): string {
        return this.createdBy.id;
    }

    public constructor(props: CharacterLedgerEntryProps) {
        this.id = props.id;
        this.character = rel(Character, props.characterId);
        this.currency = rel(GuildCurrency, props.currencyId);
        this.type = props.type;
        this.quantity = props.quantity;
        this.reason = props.reason;
        this.createdAt = props.createdAt;
        this.createdBy = rel(GuildUser, props.createdByGuildUserId);
    }
}