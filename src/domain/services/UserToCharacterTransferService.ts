import { Character } from "#domain/Character.ts";
import { Currency } from "#domain/Currency.ts";
import { Guid } from "#domain/Guid.ts";
import { GuildUser } from "#domain/GuildUser.ts";
import { CharacterRepository, ICharacterRepository } from "#domain/repos/CharacterRepository.ts";
import { GuildUserRepository, IGuildUserRepository } from "#domain/repos/GuildUserRepository.ts";
import { Transaction } from "#domain/Transaction.ts";
import { MikroORM } from "@mikro-orm/postgresql";



export class UserToCharacterTransferService {
    private constructor() { }

    public static async commitTransferAsync(fromGuildUserId: Guid, toCharacterId: Guid, currency: Currency, reason: string, client: MikroORM): Promise<[GuildUser, Character]> {
        let guildUser: GuildUser | undefined;
        let character: Character | undefined;

        await client.em.transactional(async em => {
            const guildUserRepository: IGuildUserRepository = new GuildUserRepository(em);
            const characterRepository: ICharacterRepository = new CharacterRepository(em);
    
            guildUser = await guildUserRepository.findOneAsync(fromGuildUserId);
            character = await characterRepository.findOneAsync(toCharacterId);

            if (!guildUser)
                throw new Error(`Invalid Transaction: Cannot find guild user for id ${fromGuildUserId.value}.`);
            if (!character)
                throw new Error(`Invalid Transaction: Cannot find character for id ${toCharacterId.value}.`);
    
            const transaction = new Transaction({
                creditorGuid: fromGuildUserId,
                debitorGuid: toCharacterId,
                reason,
                currency
            });

            guildUser.credit(transaction);
            character.debit(transaction);

            await guildUserRepository.syncEntitiesAsync();
            characterRepository.syncEntities();
        });

        return [guildUser!, character!];
    }
}