import { Character as DomainCharacter } from "../Character.ts";
import { Guid } from "../Guid.ts";

import * as DB from '#schema'
import { EntityMap } from "./EntityMap.ts";
import { Ledger } from "#domain/Ledger.ts";
import { BonusEntry, CreditEntry, DebitEntry, DeductionLedgerEntry, ExpenditureLedgerEntry, RoleClaimEntry } from "#domain/LedgerEntry.ts";
import { Currency } from "#domain/Currency.ts";
import { EntityManager, wrap } from "@mikro-orm/postgresql";
import { Snowflake } from "#domain/Snowflake.ts";

export interface ICharacterRepository {
    findOneAsync(characterId: Guid): Promise<DomainCharacter | undefined>;
    findByNameAsync(guildId: Snowflake, name: string): Promise<DomainCharacter[]>;
    findAsync(characterIds: Guid[]): Promise<DomainCharacter[]>;
    findByGuild(guildId: Guid): Promise<DomainCharacter[]>;
    add(character: DomainCharacter): void;
    syncEntities(): void;
    saveAsync(): Promise<void>;
}

//so far findOne, add, and save can all be made pretty generic...
export class CharacterRepository implements ICharacterRepository {
    protected db: EntityManager;
    protected entityMap: CharacterEntityMap = new CharacterEntityMap();

    constructor(manager: EntityManager) {
        this.db = manager;
    }

    public async findOneAsync(characterId: Guid): Promise<DomainCharacter | undefined> {
        let domainEntity: DomainCharacter | undefined = this.entityMap.getById(characterId);

        if (!!domainEntity) return domainEntity;

        const databaseEntity: DB.Character | undefined = await this.db.findOne(DB.Character, { id: characterId.value }, { 
            populate: ['ledgerEntries', 'ledgerEntries.currency']
        }) ?? undefined;

        if (!databaseEntity) return undefined;

        domainEntity = this.entityMap.mapToDomainEntity(databaseEntity);
        this.entityMap.set(domainEntity, databaseEntity);
        return domainEntity;
    }

    public async findAsync(characterIds: Guid[]): Promise<DomainCharacter[]> {
        let idsToQuery: string[] = [];
        let characters: DomainCharacter[] = [];

        for (const id of characterIds) {
            const character: DomainCharacter | undefined = this.entityMap.getById(id)

            if (!!character) characters = [...characters, character];
            else idsToQuery = [...idsToQuery, id.value];
        };

        for (const dbEntity of (await this.db.find(DB.Character, { id: idsToQuery }, { populate: ['ledgerEntries', 'ledgerEntries.currency'] }))) {
            const domainEntity = this.entityMap.mapToDomainEntity(dbEntity);
            characters = [...characters, domainEntity];
            this.entityMap.set(domainEntity, dbEntity);
        }

        return characters;
    }

    public async findByNameAsync(guildId: Snowflake, name: string): Promise<DomainCharacter[]> {
        let domainCharacters: DomainCharacter[] = [];

        const dbCharacters = await this.db.find(DB.Character, {
            owner: {
                guild: { discordId: guildId.value }
            },
            name: { $like: `%${name}%` }, 
        })

        for (const dbCharacter of dbCharacters) {
            const domainCharacter: DomainCharacter = this.entityMap.getById(new Guid(dbCharacter.id))
                || this.entityMap.mapToDomainEntity(dbCharacter);

            this.entityMap.set(domainCharacter, dbCharacter);
            domainCharacters = [...domainCharacters, domainCharacter];
        }

        return domainCharacters;
    }

    public async findByGuild(guildId: Guid): Promise<DomainCharacter[]> {
        let domainCharacters: DomainCharacter[] = [];

        const dbCharacters = await this.db.find(DB.Character, {
            owner: {
                guild: { discordId: guildId.value }
            }
        })

        for (const dbCharacter of dbCharacters) {
            const domainCharacter: DomainCharacter = this.entityMap.getById(new Guid(dbCharacter.id))
                || this.entityMap.mapToDomainEntity(dbCharacter);

            this.entityMap.set(domainCharacter, dbCharacter);
            domainCharacters = [...domainCharacters, domainCharacter];
        }

        return domainCharacters;
    }
    
    public add(domainEntity: DomainCharacter): void {
        const databaseEntity = this.entityMap.mapToDatabaseEntity(domainEntity); //in this case, it's first creation (ideally)
        this.entityMap.set(domainEntity, databaseEntity);
    }

    public syncEntities(): void {
        for (const [domainEntity, dbEntity] of this.entityMap.entries) {
            const mappedEntity = this.entityMap.mapToDatabaseEntity(domainEntity);
            wrap(dbEntity).assign(mappedEntity);
        };
    }
    
    public async saveAsync(): Promise<void> {
        this.syncEntities();
        await this.db.flush();
    }
}

class CharacterEntityMap extends EntityMap<DomainCharacter, DB.Character> {
    public getById(id: Guid): DomainCharacter | undefined {
        return Array.from(this.map.entries())
            .map(([domainEntity, _]) => domainEntity)
            .find(domainEntity => domainEntity.id.equals(id));
    }

    public mapToDomainEntity(databaseEntity: DB.Character): DomainCharacter {
        return DomainCharacter.reconstitute({
            id: new Guid(databaseEntity.id),
            name: databaseEntity.name,
            ownerId: new Guid(databaseEntity.ownerId),
            ledger: new Ledger(databaseEntity.ledgerEntries.map(entry => {

                const entryProps = {
                    id: new Guid(entry.id),
                    currency: new Currency(new Guid(entry.currency.id), entry.quantity),
                    reason: entry.reason,
                    createdAt: entry.createdAt,
                    createdById: new Guid(entry.createdById)
                };

                switch (entry.type) {
                    case DB.LedgerEntryType.Bonus: 
                        return new BonusEntry(entryProps);
                    case DB.LedgerEntryType.Debit: 
                        return new DebitEntry(entryProps);
                    case DB.LedgerEntryType.Credit:
                        return new CreditEntry(entryProps);
                    case DB.LedgerEntryType.Deduction:
                        return new DeductionLedgerEntry(entryProps);
                    case DB.LedgerEntryType.Expenditure:
                        return new ExpenditureLedgerEntry(entryProps);
                    default:
                        throw Error(`Ledger entry type of ${entry.type} is not allowed for character ledgers.`);
                }
            }))
        })
    }

    public mapToDatabaseEntity(domainEntity: DomainCharacter): DB.Character {
        let databaseEntity: DB.Character = this.createOrAssignObject(this.get(domainEntity), new DB.Character(domainEntity.id.value, domainEntity.name, domainEntity.ownerId.value));
        
        const mappedDomainLedgerEntries: DB.CharacterLedgerEntry[] = domainEntity.ledger.entries.map(entry => new DB.CharacterLedgerEntry({
            id: entry.id.value,
            characterId: databaseEntity.id,
            currencyId: entry.currency.typeId.value,
            type: entry.type,
            quantity: entry.currency.quantity,
            reason: entry.reason,
            createdAt: entry.createdAt,
            createdByGuildUserId: entry.createdById.value
        }));
        
        databaseEntity.ledgerEntries = this.processCollection(databaseEntity.ledgerEntries, mappedDomainLedgerEntries);

        return databaseEntity;
    }
}