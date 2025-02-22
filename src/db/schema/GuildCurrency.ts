import { Entity, IType, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';;
import { Guild } from './Guild.ts';


@Entity()
export class GuildCurrency {
    @PrimaryKey({ type: 'uuid' })
    id: string

    @ManyToOne()
    guild!: Rel<Guild>;

    @Property()
    name!: string;

    @Property()
    disabledAt?: Date;

    get enabled(): boolean {
        return !this.disabledAt;
    }

    set enabled(enabled: boolean) {
        if ((!!this.disabledAt && !enabled) || (!this.disabledAt && enabled)) return;
             
        if (!this.disabledAt && !enabled) 
            this.disabledAt = new Date();
        else 
            this.disabledAt = undefined;
    }

    public constructor(id: string, name: string, enabled: boolean) {
        this.id = id;
        this.name = name;
        this.enabled = enabled;
    }
}