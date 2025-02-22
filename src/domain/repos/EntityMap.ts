import { Collection, wrap } from "@mikro-orm/postgresql";

interface HasId extends Object {
    id: string
}

export abstract class EntityMap<DomainEntity, DatabaseEntity> {
    protected map = new Map<DomainEntity, DatabaseEntity>();

    public get(domainEntity: DomainEntity): DatabaseEntity | undefined {
        return this.map.get(domainEntity);
    }

    public set(domainEntity: DomainEntity, databaseEntity: DatabaseEntity): void {
        if (this.map.get(domainEntity)) return;

        this.map.set(domainEntity, databaseEntity);
    }

    public get entries(): MapIterator<[DomainEntity, DatabaseEntity]> {
        return this.map.entries();
    }

    public abstract mapToDomainEntity(databaseEntity: DatabaseEntity): DomainEntity;

    public abstract mapToDatabaseEntity(domainEntity: DomainEntity): DatabaseEntity;
    
    public createOrAssignObject<T>(persistedObject: any | undefined, mappedObject: any): any {
        return !!persistedObject
            ? wrap(persistedObject).assign(mappedObject, { updateNestedEntities: false })
            : mappedObject;
    }

    public processCollection<T extends HasId>(persistedCollection: Collection<T>, mappedItems: T[], assignmentOverrideCallback?: (persistedItem: T, mappedItem: T) => T): Collection<T> {
        for (const mappedItem of mappedItems) {
            const persistedItem: T | undefined = persistedCollection.find(pItem => pItem.id === mappedItem.id);

            if (!!persistedItem) {
                let assignmentItem: any = !!assignmentOverrideCallback ? assignmentOverrideCallback(persistedItem, mappedItem) : mappedItem;
                wrap(persistedItem).assign(assignmentItem, { updateNestedEntities: false });//come back in 10 years when your typescript skill is better
            }
            else { 
                persistedCollection.add(mappedItem);
            }
        }

        for (const persistedItem of persistedCollection) {
            if (!mappedItems.some(mItem => mItem.id === persistedItem.id))
                persistedCollection.remove(persistedItem);
        }

        return persistedCollection;
    }
}

