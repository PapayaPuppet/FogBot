import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'

import { GuildCommand } from './GuildCommand.ts'

import { Guild } from '../domain/Guild.ts'
import { CurrencyType } from '../domain/CurrencyType.ts'
import { Snowflake } from '#domain/Snowflake.ts';
import { DomainInvariantError } from '#domain/DomainInvariantException.ts';

export class CurrencyCommand extends GuildCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    Commands = {
        List: "list",
    }
    
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            if (!interaction.guildId)
                return interaction.reply({ content: 'Sorry, but I only work in guilds!' })

            const guildId: Snowflake = new Snowflake(interaction.guildId!);

            let requestorGuild: Guild | undefined = (await this.guildRepository.findOneAsync(guildId))
                || await this.createGuildAsync(guildId)
            
            const subcommand = interaction.options.getSubcommand()

            switch (subcommand) {
                case this.Commands.List:
                    await this.listCurrenciesAsync(interaction, requestorGuild)

                    return;
            }
        }
        catch (error: any) {
            if (error instanceof DomainInvariantError) {
                interaction.reply({
                    content: error.message,
                    ephemeral: true
                });
            }
            else {
                interaction.reply({
                    content: 'That didn\'t work, something went wrong unexpectedly.',
                    ephemeral: true
                });
            }
        }
    }
    
    async listCurrenciesAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        let content: string = ''
        const enabledCurrencies: CurrencyType[] = requestorGuild.currencyTypes.filter(type => type.enabled)
        const disabledCurrencies: CurrencyType[] = requestorGuild.currencyTypes.filter(type => !type.enabled)

        enabledCurrencies.forEach((type, idx) => {
            content += `- ${type.name}`
            content += idx === enabledCurrencies.length - 1 ? '' : '\n'
        })

        if (disabledCurrencies.length > 0) {
            content += '\n__Disabled__:'

            disabledCurrencies.forEach((type, idx) => {
                content += `- ${type.name}`
            })
        }

        interaction.reply({
            content: content,
            ephemeral: true
        })
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        console.log('Registering global currency command.')

        registry.registerChatInputCommand(builder => builder
            .setName('currency')
            .setDescription('Guild currency tools.')
            .addSubcommand(subcommand => 
                subcommand
                    .setName(this.Commands.List)
                    .setDescription('List all currencies for this guild.')
            )
        )
    }
}