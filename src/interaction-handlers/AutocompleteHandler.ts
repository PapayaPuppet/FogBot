import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AutocompleteInteraction, Collection, Role } from 'discord.js';
import { GuildRepository, IGuildRepository } from '../domain/repos/GuildRepository.ts';
import { CurrencyType } from '../domain/CurrencyType.ts';
import { Guild } from '#domain/Guild.ts';
import { Snowflake } from '#domain/Snowflake.ts';

import * as DB from '#schema';

import { GuildUserRepository, IGuildUserRepository } from '#domain/repos/GuildUserRepository.ts';
import { CharacterRepository, ICharacterRepository } from '#domain/repos/CharacterRepository.ts';
import { AdminCommands } from '#root/commands/AdminCommand.ts';

export class AutocompleteHandler extends InteractionHandler {
    readonly guildRepository: IGuildRepository;
    readonly guildUserRepository: IGuildUserRepository;
    readonly characterRepository: ICharacterRepository;

    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Autocomplete
        });

        this.guildRepository = new GuildRepository(this.container.sqlClient.em);
        this.guildUserRepository = new GuildUserRepository(this.container.sqlClient.em);
        this.characterRepository = new CharacterRepository(this.container.sqlClient.em);
    }

    protected async filterCurrencyTypes(guildId: Snowflake, text: string, enabledOnly: boolean = true): Promise<CurrencyType[]> {
        const guild: Guild | undefined = await this.guildRepository.findOneAsync(guildId);

        if (!guild)
            throw new Error('Cannot find guild that matches request.');

        return guild.currencyTypes
            .filter(c => !enabledOnly || c.enabled)
            .filter(c => c.name.toLowerCase().includes(text.toLowerCase()))
    }

    protected async filterCharactersAsync(guildId: Snowflake, text: string): Promise<{ name: string, value: string, userId: string }[]> {
        return (await this.container.sqlClient.em.fork().find(DB.Character, { //i find the queryBuilder to suck fucking shit
            owner: { 
                guild: { discordId: guildId.value }
            },
            name: { $ilike: `%${text}%` }, 
        }, {
            populate: ['owner.user']
        }))
        .map(character => ({
            name: character.name,
            value: character.id,
            userId: character.owner.user.discordId
        }));
    }

    protected async filterUserCharactersAsync(guildId: Snowflake, userId: Snowflake, text: string): Promise<{ name: string, value: string, userId: string }[]> {
        return (await this.container.sqlClient.em.fork().find(DB.Character, { //i find the queryBuilder to suck fucking shit
            owner: { 
                user: { discordId: userId.value },
                guild: { discordId: guildId.value }
            },
            name: { $like: `%${text}%` }, 
        }, {
            populate: ['owner.user']
        }))
        .map(character => ({
            name: character.name,
            value: character.id,
            userId: character.owner.user.discordId
        }));
    }

    protected async filterClaimsAsync(interaction: AutocompleteInteraction, guildId: Snowflake): Promise<{ name: string, value: string }[]> {
        const guild = await this.guildRepository.findOneAsync(guildId);

        const filterText: string = interaction.options.getFocused(true).value.toLowerCase();
        const roles: Collection<string, Role> = await interaction.guild!.roles.fetch();
        const currencyTypeIdToNameMap: Map<string, string> = new Map(guild!.currencyTypes.map(type => [type.id.value, type.name]));

        return guild?.roleClaims
            .filter(claim => roles.get(claim.roleId.value)!.name.toLowerCase().includes(filterText) || currencyTypeIdToNameMap.get(claim.currencyTypeId.value)?.toLowerCase().includes(filterText))
            .map(claim => ({
                roleName: roles.get(claim.roleId.value)!.name,
                currencyName: currencyTypeIdToNameMap.get(claim.currencyTypeId.value)!,
                quantity: claim.quantity,
                id: claim.id
            }))
            .sort((a, b) => {
                if (a.roleName < b.roleName) return -1
                else if (a.roleName > b.roleName) return 1
                else return (a.currencyName < b.currencyName) ? -1 : 1 //no two claims of the same currency type should share the same role
            })
            .map(claim => ({
                name: `${claim.roleName}: ${claim.quantity} ${claim.currencyName}`,
                value: claim.id.value
            })) || [];
    }

    protected async filterJoinableRolesAsync(interaction: AutocompleteInteraction, guildId: Snowflake): Promise<{ name: string, value: string }[]> {
        const guild = await this.guildRepository.findOneAsync(guildId);

        const filterText: string = interaction.options.getFocused(true).value.toLowerCase();
        const roles: Collection<string, Role> = await interaction.guild!.roles.fetch();

        return guild!.roles
            .filter(role => role.joinable)
            .map(role => ({
                name: roles.get(role.roleId.value)!.name,
                id: role.roleId.value
            }))
            .filter(role => role.name.toLowerCase().includes(filterText))
            .sort((a, b) => {
                if (a.name < b.name) return -1
                return 1;
            })
            .map(role => ({
                name: role.name,
                value: role.id
            }))
    }

    public override async parse(interaction: AutocompleteInteraction) {
        try {
            const option = interaction.options.getFocused(true);

            console.log('Autocomplete for ', option.name)
    
            switch (option.name) {
                case 'currency': 
                    const enabledCurrenciesOnly = [AdminCommands.Commands.Currency.Update].includes(interaction.commandName); 
                    const currencyTypes: CurrencyType[] = await this.filterCurrencyTypes(new Snowflake(interaction.guildId!), option.value, enabledCurrenciesOnly);
    
                    if (currencyTypes.length === 0)
                        return this.none();
    
                    return this.some(currencyTypes.map(c => ({
                            name: c.name,
                            value: c.id.value
                        })
                    ));
    
                case 'character':
                    if (interaction.commandName === 'admin') {
                        const characterSearchResults = await this.filterCharactersAsync(new Snowflake(interaction.guildId!), option.value);
                        //await this.filterUserCharactersAsync(new Snowflake(interaction.guildId!), new Snowflake(interaction.user.id), option.value);
        
                        var results = await Promise.all(characterSearchResults.map(async result => {
                            const user = await interaction.guild?.members.fetch(result.userId);
                            return {
                                name: `${result.name} - ${user?.displayName}`,
                                value: result.value
                            };
                        }))
    
                        return this.some(results);
                    }
                    else {
                        const characterSearchResults = await this.filterUserCharactersAsync(new Snowflake(interaction.guildId!), new Snowflake(interaction.user.id), option.value);
                        var results = await Promise.all(characterSearchResults.map(async result => {
                            const user = await interaction.guild?.members.fetch(result.userId);
                            return {
                                name: `${result.name} - ${user?.displayName}`,
                                value: result.value
                            };
                        }))
                        return this.some(characterSearchResults);
                    }
                
                case 'claim':
                    return this.some(await this.filterClaimsAsync(interaction, new Snowflake(interaction.guild!.id)));
    
                case 'role':
                    return this.some(await this.filterJoinableRolesAsync(interaction, new Snowflake(interaction.guild!.id)));
    
                default:
                    return this.none();
            }
        }
        catch (error) {
            console.log(error);
            return this.none();
        }
    }

    public override async run(interaction: AutocompleteInteraction, result: InteractionHandler.ParseResult<this>) {
        console.log('run', result)
        return interaction.respond(result);
    }
}