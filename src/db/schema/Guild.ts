import { BigIntType, Cascade, Collection, Entity, IType, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { GuildUser } from '#schema/GuildUser.ts'
import { GuildCurrency } from '#schema/GuildCurrency.ts'
import { GuildRole } from '#schema/GuildRole.ts'


@Entity()
export class Guild {

    @PrimaryKey({ type: 'uuid' })
    id: string;

    @Property({ type: new BigIntType('bigint')})
    discordId!: string;

    @Property()
    logChannelId?: string;

    @OneToMany(() => GuildUser, (guildUser: GuildUser) => guildUser.guild, { cascade: [Cascade.MERGE] })
    guildUsers = new Collection<GuildUser>(this);

    @OneToMany(() => GuildCurrency, (currency: GuildCurrency) => currency.guild)
    currencies = new Collection<GuildCurrency>(this);

    @OneToMany(() => GuildRole, (role: GuildRole) => role.guild)
    roles = new Collection<GuildRole>(this);

    public constructor(id: string, discordId: string, logChannelId: string | undefined) {
        this.id = id;
        this.discordId = discordId;
        this.logChannelId = logChannelId;
    }
}