import { EntityManager, wrap } from '@mikro-orm/postgresql'
import 'core-js/proposals/array-grouping-v2';

import * as DB from '#schema'

import { Guild as DomainGuild } from '../Guild.ts'
import { GuildRoleClaim } from '../GuildRoleClaim.ts'
import { CurrencyType } from '../CurrencyType.ts'
import { Currency } from '../Currency.ts'
import { Snowflake } from '#domain/Snowflake.ts'
import { Guid } from '#domain/Guid.ts'
import { EntityMap } from './EntityMap.ts'
import { GuildRole } from '#domain/GuildRole.ts';

export interface IGuildRepository {
    findOneAsync: (guildId: Snowflake) => Promise<DomainGuild | undefined>
    add: (domainGuild: DomainGuild) => void
    syncEntities(): void
    saveAsync: () => Promise<void>
}

//make sure to go back and load all required props when querying
export class GuildRepository implements IGuildRepository {
    protected db: EntityManager;
    protected entityMap: GuildEntityMap = new GuildEntityMap();

    constructor(manager: EntityManager) {
        this.db = manager.fork();
    }

    public async findOneAsync(guildId: Snowflake): Promise<DomainGuild | undefined> {
        let domainEntity: DomainGuild | undefined = this.entityMap.getById(guildId);

        if (!!domainEntity) return domainEntity;

        const databaseEntity: DB.Guild | undefined = await this.db.findOne(DB.Guild, { discordId: guildId.value }, {
            populate: [ 'roles', 'currencies', 'roles.claims' ]
        }) ?? undefined;

        if (!databaseEntity) return undefined;

        domainEntity = this.entityMap.mapToDomainEntity(databaseEntity);
        this.entityMap.set(domainEntity, databaseEntity);
        return domainEntity;
    }

    public add(domainEntity: DomainGuild): void {
        const databaseEntity = this.entityMap.mapToDatabaseEntity(domainEntity);
        this.entityMap.set(domainEntity, databaseEntity);
    }

    public syncEntities(): void {
        for (const [domainEntity, dbEntity] of this.entityMap.entries) { 
            const mappedEntity = this.entityMap.mapToDatabaseEntity(domainEntity);
            delete mappedEntity['guildUsers']; //remove properties that we don't include on the mapped aggregate. 
            wrap(dbEntity).assign(mappedEntity);
        };
    }
    
    public async saveAsync(): Promise<void> {
        this.syncEntities();
        await this.db.flush();
    }
}

class GuildEntityMap extends EntityMap<DomainGuild, DB.Guild> {

    public getById(id: Snowflake): DomainGuild | undefined {
        return Array.from(this.map.entries())
            .map(([domainEntity, _]) => domainEntity)
            .find(domainEntity => domainEntity.guildId.equals(id));
    }

    public mapToDomainEntity(databaseEntity: DB.Guild): DomainGuild {
        return DomainGuild.reconstitute({
            id: new Guid(databaseEntity.id),
            logChannelId: !!databaseEntity.logChannelId ? new Snowflake(databaseEntity.logChannelId) : undefined,
            guildId: new Snowflake(databaseEntity.discordId),
            roles: databaseEntity.roles.map(dbRole => new GuildRole({
                id: new Guid(dbRole.id),
                roleId: new Snowflake(dbRole.discordId),
                joinable: dbRole.joinable,
                claims: dbRole.claims.map(dbClaim => new GuildRoleClaim(
                    new Guid(dbClaim.id),
                    new Currency(new Guid(dbClaim.guildCurrency.id), dbClaim.quantity)
                ))
            })),
            currencyTypes: databaseEntity.currencies.map(currency => new CurrencyType(new Guid(currency.id), currency.name, !currency.disabledAt))
        });
    }

    public mapToDatabaseEntity(domainEntity: DomainGuild): DB.Guild {
        const databaseEntity: DB.Guild = this.createOrAssignObject(this.get(domainEntity), new DB.Guild(domainEntity.id.value, domainEntity.guildId.value, domainEntity.logChannelId?.value))

        databaseEntity.roles = this.processCollection(
            databaseEntity.roles,
            domainEntity.roles.map(domainRole => new DB.GuildRole(
                domainRole.id.value, 
                domainRole.roleId.value,
                domainEntity.id.value,
                domainRole.joinable
            ))
        );

        const roleClaims = domainEntity.roleClaims.map(roleClaim => 
            new DB.RoleClaim(roleClaim.id.value, roleClaim.roleId.value, roleClaim.currencyTypeId.value, roleClaim.quantity)
        );

        for (const role of databaseEntity.roles) {
            role.claims = this.processCollection(
                role.claims,
                roleClaims.filter(claim => claim.guildRole.id === role.id)
            );
        }

        //not as declarative as I'd like it. Figure a way to make it obvious what all this does at a glance.
        databaseEntity.currencies = this.processCollection(
            databaseEntity.currencies, 
            domainEntity.currencyTypes.map(currency => new DB.GuildCurrency(currency.id.value, currency.name, currency.enabled)),
            (persistedEntity, mappedEntity) => {
                mappedEntity.disabledAt = persistedEntity.enabled === mappedEntity.enabled ? persistedEntity.disabledAt : mappedEntity.disabledAt;
                mappedEntity.guild = databaseEntity;
                return mappedEntity;
            }
        );

        return databaseEntity;
    }
}
