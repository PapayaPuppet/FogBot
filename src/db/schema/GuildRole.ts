
import { BigIntType, Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property, rel, Rel } from '@mikro-orm/core';
import { Guild } from './Guild.ts';
import { RoleClaim } from './RoleClaim.ts';

@Entity()
export class GuildRole {
    @PrimaryKey({ type: 'uuid' })
    id: string;

    @Property({ type: new BigIntType('bigint')})
    discordId!: string;

    @Property({ default: false })
    joinable: boolean = false;

    @ManyToOne()
    guild!: Rel<Guild>;

    @OneToMany(() => RoleClaim, (claim: RoleClaim) => claim.guildRole, { orphanRemoval: true })
    claims = new Collection<RoleClaim>(this);

    public constructor(id: string, discordId: string, guildId: string, joinable: boolean) {
        this.id = id;
        this.guild = rel(Guild, guildId);
        this.discordId = discordId;
        this.joinable = joinable;
    }
}