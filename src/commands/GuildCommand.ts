import { TextChannel, ActionRowBuilder, StringSelectMenuBuilder, APISelectMenuOption, ComponentType, GuildMember, Collection, Role } from 'discord.js';

import  { Command } from '@sapphire/framework'

import { GuildRepository, IGuildRepository } from '#domain/repos/GuildRepository.ts';

import { Guild } from '#domain/Guild.ts';
import { LedgerEntry } from '#domain/LedgerEntry.ts';
import { GuildUser } from '#domain/GuildUser.ts';
import { Snowflake } from '#domain/Snowflake.ts';
import { GuildUserRepository, IGuildUserRepository } from '#domain/repos/GuildUserRepository.ts';
import { CharacterRepository, ICharacterRepository } from '#domain/repos/CharacterRepository.ts';
import { Guid } from '#domain/Guid.ts';
import { Character } from '#domain/Character.ts';
import { GuildRoleClaim } from '#domain/GuildRoleClaim.ts';

export abstract class GuildCommand extends Command {
    readonly guildRepository: IGuildRepository;
    readonly guildUserRepository: IGuildUserRepository;
    readonly characterRepository: ICharacterRepository;
    
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });

        this.guildRepository = new GuildRepository(this.container.sqlClient.em.fork());
        this.guildUserRepository = new GuildUserRepository(this.container.sqlClient.em.fork());
        this.characterRepository = new CharacterRepository(this.container.sqlClient.em.fork());
    }

    async createGuildUserAsync(guildId: Snowflake, userId: Snowflake): Promise<GuildUser> {
        const guildUser: GuildUser = GuildUser.create(guildId, userId);

        await this.guildUserRepository.addAsync(guildUser);
        await this.guildUserRepository.saveAsync();

        return guildUser;
    }

    async createGuildAsync(guildId: Snowflake): Promise<Guild> {
        const guild: Guild = Guild.create(guildId);

        this.guildRepository.add(guild);
        await this.guildRepository.saveAsync();

        return guild;
    }

    getUserFromInteraction(interaction: Command.ChatInputCommandInteraction, userId: string): GuildMember {
        return interaction.guild!.members.cache.get(userId)!;
    }

    public async promptForValidJoinableRole(interaction: Command.ChatInputCommandInteraction, guild: Guild): Promise<Snowflake> {
        await interaction.deferReply();
        const roles: Collection<string, Role> = await interaction.guild!.roles.fetch();

        const messageActionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .setComponents(
            new StringSelectMenuBuilder()
            .setCustomId('selectJoinableRoleMenu')
            .setPlaceholder('Role')
            .setOptions(guild.roles
                .map(role => ({
                    roleName: roles.get(role.roleId.value)!.name,
                    id: role.id
                }))
                .sort((a, b) => {
                    if (a.roleName < b.roleName) return -1
                    else if (a.roleName > b.roleName) return 1
                    else return 0
                })
                .map(role => ({
                    label: role.roleName,
                    value: role.id.value
                })) as APISelectMenuOption[])
        );

        const prompt = await interaction.followUp({
            content: 'Sorry, but that role is not valid. Please choose one of the following.',
            components: [messageActionRow],
            ephemeral: true
        });

        const reinteraction = await prompt.awaitMessageComponent({
            componentType: ComponentType.StringSelect
        });

        return new Snowflake(reinteraction.values[0]);
    }

    public async promptForValidClaim(interaction: Command.ChatInputCommandInteraction, guild: Guild): Promise<Guid> {
        await interaction.deferReply();
        const roles: Collection<string, Role> = await interaction.guild!.roles.fetch();

        const messageActionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .setComponents(
            new StringSelectMenuBuilder()
            .setCustomId('selectClaimMenu')
            .setPlaceholder('Claim')
            .setOptions(guild.roleClaims
                .map(claim => ({
                    roleName: roles.get(claim.roleId.value)!.name,
                    currencyName: claim.currencyTypeName,
                    quantity: claim.quantity,
                    id: claim.id
                }))
                .sort((a, b) => {
                    if (a.roleName < b.roleName) return -1
                    else if (a.roleName > b.roleName) return 1
                    else return (a.currencyName < b.currencyName) ? -1 : 1 //no two claims of the same currency type should share the same role
                })
                .map(claim => ({
                    label: `${claim.roleName}: ${claim.quantity} ${claim.currencyName}`,
                    value: claim.id.value
                })) as APISelectMenuOption[])
        );

        const prompt = await interaction.followUp({
            content: 'Sorry, but that claim is not valid. Please choose one of the following.',
            components: [messageActionRow],
            ephemeral: true
        });

        const reinteraction = await prompt.awaitMessageComponent({
            componentType: ComponentType.StringSelect
        });

        return new Guid(reinteraction.values[0]);
    }

    private async promptForValidCharacter(interaction: Command.ChatInputCommandInteraction, characters: Character[]): Promise<Guid> {
        const messageActionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                .setCustomId('selectCharacterMenu')
                .setPlaceholder('Character')
                .setOptions(characters.map(character => ({
                    label: character.name,
                    value: character.id.value
                })) as APISelectMenuOption[])
            );

        const prompt = await interaction.followUp({
            content: 'Sorry, but that character is not valid. Please choose one of the following.',
            components: [messageActionRow],
            ephemeral: true
        });

        const reinteraction = await prompt.awaitMessageComponent({
            componentType: ComponentType.StringSelect
        });

        return new Guid(reinteraction.values[0]);
    }

    async promptForValidCharacterIdByGuild(interaction: Command.ChatInputCommandInteraction, guild: Guild): Promise<Guid> {
        await interaction.deferReply();
        return await this.promptForValidCharacter(interaction, await this.characterRepository.findByGuild(guild.id));
    }

    async promptForValidCharacterIdByUser(interaction: Command.ChatInputCommandInteraction, user: GuildUser): Promise<Guid> {
        await interaction.deferReply();
        return await this.promptForValidCharacter(interaction, await this.characterRepository.findAsync(user.ownedCharacterIds));
    }

    async promptForValidCurrencyAsync(interaction: Command.ChatInputCommandInteraction, guild: Guild): Promise<Guid> {
        await interaction.deferReply();

        const messageActionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                .setCustomId('selectCurrencyMenu')
                .setPlaceholder('Currency')
                .setOptions(guild.currencyTypes.map(currencyType => ({
                    label: currencyType.name,
                    value: currencyType.id.value
                })) as APISelectMenuOption[])
            );

        const prompt = await interaction.followUp({
            content: 'Sorry, but that currency is not valid. Please choose one of the following.',
            components: [messageActionRow],
            ephemeral: true
        });

        const reinteraction = await prompt.awaitMessageComponent({
            componentType: ComponentType.StringSelect
        });

        return new Guid(reinteraction.values[0]);
    }
}