import { BigIntType, Cascade, Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property, rel } from "@mikro-orm/postgresql";
import { Character } from "./Character.ts";
import { Guild } from "./Guild.ts";
import { GuildUserLedgerEntry } from "./GuildUserLedgerEntry.ts";


@Entity()
export class User {
    @PrimaryKey({ type: 'uuid' })
    id: string
    
    @Property({ type: new BigIntType('bigint')})
    discordId!: string

    constructor(id: string, discordId: string) {
        this.id = id;
        this.discordId = discordId;
    }
}

@Entity()
export class GuildUser {
    @PrimaryKey({ type: 'uuid' })
    id: string

    @ManyToOne()
    guild: Guild;

    @ManyToOne(() => User, { cascade: [Cascade.PERSIST], })
    user!: User;
    
    @OneToMany({ mappedBy: 'guildUser' })
    ledgerEntries: Collection<GuildUserLedgerEntry> = new Collection<GuildUserLedgerEntry>(this);

    @OneToMany(() => Character, (character: Character) => character.owner)
    characters = new Collection<Character>(this);

    public constructor(id: string, userId: string, userDiscordId: string) {
        this.id = id;
        this.user = new User(userId, userDiscordId);
    }
}