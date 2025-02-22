
import { Entity, ManyToOne, PrimaryKey, Property, rel, Rel } from '@mikro-orm/core';
import { GuildCurrency } from './GuildCurrency.ts';
import { GuildRole } from './GuildRole.ts';

@Entity()
export class RoleClaim {
    @PrimaryKey({ type: 'uuid' })
    id: string;

    @ManyToOne()
    guildCurrency!: Rel<GuildCurrency>;

    @ManyToOne()
    guildRole!: Rel<GuildRole>;

    @Property()
    quantity!: number;

    constructor(id: string, roleId: string, currencyId: string, quantity: number) {
        this.id = id;
        this.guildCurrency = rel(GuildCurrency, currencyId);
        this.guildRole = rel(GuildRole, roleId);
        this.quantity = quantity;
    }
}