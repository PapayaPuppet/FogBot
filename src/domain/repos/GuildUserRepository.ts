import { GuildUser as DomainGuildUser } from "../GuildUser.ts";
import { Snowflake } from "../Snowflake.ts";

import * as DB from '#schema'
import { EntityMap } from "./EntityMap.ts";
import { Guid } from "#domain/Guid.ts";
import { Ledger } from "#domain/Ledger.ts";
import { Currency } from "#domain/Currency.ts";
import { BonusEntry, CreditEntry, DebitEntry, DeductionLedgerEntry, ExpenditureLedgerEntry, RoleClaimEntry } from "#domain/LedgerEntry.ts";
import { EntityManager, ref, rel, wrap } from "@mikro-orm/postgresql";

export interface IGuildUserRepository {
    findOneAsync(guildUserId: Guid): Promise<DomainGuildUser | undefined>;
    findOneByCompositeIdAsync(guildId: Snowflake, userId: Snowflake): Promise<DomainGuildUser | undefined>;
    findForGuildAsync(guildId: Snowflake): Promise<DomainGuildUser[]>;
    addAsync(guildUser: DomainGuildUser): Promise<void>;
    syncEntitiesAsync(): Promise<void>;
    saveAsync(): Promise<void>;
}

export class GuildUserRepository implements IGuildUserRepository {
    protected db: EntityManager;
    protected entityMap: GuildEntityMap = new GuildEntityMap();
    private _populateProperties: any = [ 'ledgerEntries', 'user', 'guild.discordId', 'characters.id' ];

    constructor(manager: EntityManager) {
        this.db = manager;
    }

    public async findOneAsync(guildUserId: Guid) {
        let domainEntity: DomainGuildUser | undefined = this.entityMap.getById(guildUserId);

        if (!!domainEntity) return domainEntity;

        const databaseEntity: DB.GuildUser | undefined = await this.db.findOne(DB.GuildUser, guildUserId.value, {
            populate: this._populateProperties
        }) ?? undefined;

        if (!databaseEntity) return undefined;

        domainEntity = this.entityMap.mapToDomainEntity(databaseEntity);
        this.entityMap.set(domainEntity, databaseEntity);
        return domainEntity;
    }

    public async findOneByCompositeIdAsync(guildId: Snowflake, userId: Snowflake): Promise<DomainGuildUser | undefined> {
        let domainEntity: DomainGuildUser | undefined = this.entityMap.getByCompositeId(guildId, userId);

        if (!!domainEntity) return domainEntity;

        const databaseEntity: DB.GuildUser | undefined = await this.db.findOne(DB.GuildUser, {
            guild: { discordId: guildId.value },
            user: { discordId: userId.value }
        }, {
            populate: this._populateProperties
        }) ?? undefined;

        if (!databaseEntity) return undefined;

        domainEntity = this.entityMap.mapToDomainEntity(databaseEntity);
        this.entityMap.set(domainEntity, databaseEntity);
        return domainEntity;
    }

    public async findForGuildAsync(guildId: Snowflake): Promise<DomainGuildUser[]> {
        let domainEntities: DomainGuildUser[] = [];

        const guildUsers: DB.GuildUser[] = await this.db.find(DB.GuildUser, { 
            guild: { discordId: guildId.value }
        }, {
            populate: this._populateProperties
        });

        for (const user of guildUsers) {
            let domainEntity: DomainGuildUser = this.entityMap.getById(new Guid(user.id))
                || this.entityMap.mapToDomainEntity(user);

            this.entityMap.set(domainEntity, user);
            domainEntities = [...domainEntities, domainEntity];
        }

        return domainEntities;
    }

    public async addAsync(domainEntity: DomainGuildUser): Promise<void> {
        const databaseEntity = this.entityMap.mapToDatabaseEntity(domainEntity);

        databaseEntity.user = rel(DB.User, (await this.db.findOne(DB.User, { discordId: domainEntity.userId.value })) || Guid.new().value);
        databaseEntity.user.discordId = domainEntity.userId.value;

        databaseEntity.guild = rel(DB.Guild, (await this.db.findOneOrFail(DB.Guild, { discordId: domainEntity.guildId.value }))); //guild not covered by this aggregate, expected to exist already. Might be an awkward spot needing reworking.

        this.entityMap.set(domainEntity, databaseEntity);
    }

    public async syncEntitiesAsync(): Promise<void> {
        for (const [domainEntity, dbEntity] of this.entityMap.entries) {
            const mappedEntity = this.entityMap.mapToDatabaseEntity(domainEntity);
            mappedEntity.guild = rel(DB.Guild, (await this.db.findOneOrFail(DB.Guild, { discordId: domainEntity.guildId.value })));
            delete mappedEntity['characters']; //remove properties that we don't include on the mapped aggregate. 
            wrap(dbEntity).assign(mappedEntity);
        };
    }

    public async saveAsync(): Promise<void> {
        await this.syncEntitiesAsync();
        await this.db.flush();
    }
}

class GuildEntityMap extends EntityMap<DomainGuildUser, DB.GuildUser> {

    public getById(id: Guid): DomainGuildUser | undefined {
        return Array.from(this.map.entries())
            .map(([domainEntity, _]) => domainEntity)
            .find(domainEntity => domainEntity.id.equals(id));
    }

    public getByCompositeId(guildId: Snowflake, userId: Snowflake): DomainGuildUser | undefined {
        return Array.from(this.map.entries())
            .map(([domainEntity, _]) => domainEntity)
            .find(domainEntity => domainEntity.guildId.equals(guildId) && domainEntity.userId.equals(userId));
    }

    public mapToDomainEntity(databaseEntity: DB.GuildUser): DomainGuildUser {
        return DomainGuildUser.reconstitute({
            id: new Guid(databaseEntity.id),
            guildId: new Snowflake(databaseEntity.guild.discordId),
            userId: new Snowflake(databaseEntity.user.discordId),
            characterIds: databaseEntity.characters.map(c => new Guid(c.id)),
            ledger: new Ledger(databaseEntity.ledgerEntries.map(entry => {
                const entryProps = {
                    id: new Guid(entry.id),
                    currency: new Currency(new Guid(entry.currency.id), entry.quantity),
                    reason: entry.reason,
                    createdAt: entry.createdAt,
                    createdById: new Guid(entry.createdById)
                };

                switch (entry.type) {
                    case DB.LedgerEntryType.Debit: 
                        return new DebitEntry(entryProps);
                        case DB.LedgerEntryType.Bonus: 
                            return new BonusEntry(entryProps);
                    case DB.LedgerEntryType.Credit:
                        return new CreditEntry(entryProps);
                    case DB.LedgerEntryType.Deduction:
                        return new DeductionLedgerEntry(entryProps);
                    case DB.LedgerEntryType.Expenditure:
                        return new ExpenditureLedgerEntry(entryProps);
                    case DB.LedgerEntryType.RoleClaim:
                        return new RoleClaimEntry({...entryProps, roleId: new Snowflake(entry.forRoleId!)});
                    default:
                        throw Error(`Ledger entry type of ${entry.type} is not allowed for guild user ledgers.`);
                }
            }))
        });
    }

    public mapToDatabaseEntity(domainEntity: DomainGuildUser): DB.GuildUser {
        let databaseEntity: DB.GuildUser = this.createOrAssignObject(this.get(domainEntity), new DB.GuildUser(domainEntity.id.value, Guid.new().value, domainEntity.userId.value));

        const mappedDomainLedgerEntries: DB.GuildUserLedgerEntry[] = domainEntity.ledger.entries.map(entry => new DB.GuildUserLedgerEntry({
            id: entry.id.value,
            guildUserId: databaseEntity.id,
            currencyId: entry.currency.typeId.value,
            type: entry.type,
            quantity: entry.currency.quantity,
            reason: entry.reason,
            roleId: entry instanceof RoleClaimEntry ? entry.roleId.value : undefined,
            createdAt: entry.createdAt,
            createdByGuildUserId: entry.createdById.value
        }));
        
        databaseEntity.ledgerEntries = this.processCollection(databaseEntity.ledgerEntries, mappedDomainLedgerEntries);
        
        return databaseEntity;
    }
}