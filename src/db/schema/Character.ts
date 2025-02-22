import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property, rel } from "@mikro-orm/postgresql";
import { GuildUser } from "#schema/GuildUser.ts";
import { CharacterLedgerEntry } from "./CharacterLedgerEntry.ts";

@Entity()
export class Character {
    @PrimaryKey({ type: 'uuid' })
    id: string

    @Property({ length: 100 })
    name!: string;

    @ManyToOne()
    owner: GuildUser;

    @Property({ persist: false })
    get ownerId(): string {
        return this.owner!.id;
    }

    @OneToMany({ mappedBy: 'character' })
    ledgerEntries: Collection<CharacterLedgerEntry> = new Collection<CharacterLedgerEntry>(this);

    public constructor(id: string, name: string, ownerId: string) {
        this.id = id;
        this.name = name;
        this.owner = rel(GuildUser, ownerId);
    }
}