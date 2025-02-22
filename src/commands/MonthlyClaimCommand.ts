import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { Collection, Role } from 'discord.js';

import { Guild } from '../domain/Guild.ts';
import { GuildRoleClaim } from '../domain/GuildRoleClaim.ts';

import { GuildCommand } from './GuildCommand.ts';
import { Snowflake } from '#domain/Snowflake.ts';
import { ReplyUtility } from '#root/utility/ReplyUtility.ts';
import { GuildUser } from '#domain/GuildUser.ts';
import { LedgerEntryType } from '#schema/LedgerEntryType.ts';
import { RoleClaimEntry } from '#domain/LedgerEntry.ts';
import { DomainInvariantError } from '#domain/DomainInvariantException.ts';
import { RoleClaimDTO } from '#domain/dto/RoleClaimDTO.ts';
import { Currency } from '#domain/Currency.ts';

export class MonthlyClaimCommand extends GuildCommand { 
    protected replyUtility: ReplyUtility;
    
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        registry.registerChatInputCommand(builder => 
            builder
                .setName('claim')
                .setDescription('Claim your monthly XP.')
        )
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
       try {
            if (!interaction.guildId)
                return interaction.reply({ content: 'Sorry, but I only work in guilds!' })
                
            this.replyUtility = new ReplyUtility(interaction, {
                ephemeral: true
            });
    
            const today: Date = new Date();
            const guildId: Snowflake = new Snowflake(interaction.guild!.id);
            const userId: Snowflake = new Snowflake(interaction.user.id);
    
            const requestorGuild: Guild = (await this.guildRepository.findOneAsync(new Snowflake(interaction.guildId)))
                || await this.createGuildAsync(guildId);

            const requestor: GuildUser = (await this.guildUserRepository.findOneByCompositeIdAsync(guildId, userId)) 
                || await this.createGuildUserAsync(guildId, userId);
    
            const userRoles: Collection<string, Role> = interaction.guild!.members.cache.get(interaction.user.id)!.roles.cache;

            const claimsForRequestor: RoleClaimDTO[] = requestorGuild!.roleClaims
                .filter(roleClaim => userRoles.has(roleClaim.roleId.value)); //no outdated claims
    
            if (claimsForRequestor.length === 0)
                return interaction.reply({
                    content: 'Sorry, but no claims exist for your server roles. Please reach out to an admin to assign you the correct roles.',
                    ephemeral: true
                });

            const existingEntriesForCurrentMonth: RoleClaimEntry[] = requestor.ledger.entries
                .filter(entry => entry.createdAt.getFullYear() === today.getFullYear())
                .filter(entry => entry.createdAt.getMonth() === today.getMonth())
                .filter(entry => entry instanceof RoleClaimEntry);

            const unclaimedClaimsForCurrentMonth: RoleClaimDTO[] = claimsForRequestor.filter(claim => 
                !existingEntriesForCurrentMonth.some(entry => entry.currency.typeId.equals(claim.currencyTypeId) && entry.roleId.equals(claim.roleId)
            ));

            if (unclaimedClaimsForCurrentMonth.length === 0)
                return this.replyUtility.reply('All of your claims have already been claimed for this month.');

            let replyBuilder = this.replyUtility.createBuilder();

            for (const [unclaimedClaim, index] of unclaimedClaimsForCurrentMonth.map((claim, idx) => [claim, idx] as [RoleClaimDTO, number])) {
                const currencyName: string = requestorGuild.currencyTypes.find(type => type.id.equals(unclaimedClaim.currencyTypeId))!.name;
                requestor.addCurrency({
                    currency: new Currency(unclaimedClaim.currencyTypeId, unclaimedClaim.quantity),
                    roleId: unclaimedClaim.roleId,
                    reason: `Claim for role: ${userRoles.find(role => role.id === unclaimedClaim.roleId.value)!.name} and currency: ${currencyName}`,
                    requestorId: requestor.id
                });

                replyBuilder = replyBuilder
                    .setCurrencyTypeById(unclaimedClaim.currencyTypeId, requestorGuild)
                    .addGuildUserLedgerEntryLine(requestor.userId, requestor.ledger.entries[index]); //this technically needs to know the insertion order, ergo is fragile and knows more than it should
            }

            await this.guildUserRepository.saveAsync();

            this.replyUtility.reply(replyBuilder.build());
            await this.replyUtility.logAsync(requestorGuild, replyBuilder.setActionLine(`${this.getUserFromInteraction(interaction, requestor.userId.value).displayName} made claims:`).build());
        }
        catch (error: any) {
            if (error instanceof DomainInvariantError) {
                this.replyUtility.reply(error.message);
            }
            else {
                interaction.reply({
                    content: 'That didn\'t work, something went wrong unexpectedly.',
                    ephemeral: true
                });
            }
        }
    }
}