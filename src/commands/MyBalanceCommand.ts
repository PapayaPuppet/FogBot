import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { GuildCommand as GuildCommand } from './GuildCommand.ts'
import { GuildUser } from '#domain/GuildUser.ts';
import { Snowflake } from '#domain/Snowflake.ts';
import { ReplyUtility } from '#root/utility/ReplyUtility.ts';
import { Guild } from '#domain/Guild.ts';
import { CurrencyType } from '#domain/CurrencyType.ts';
import { DomainInvariantError } from '#domain/DomainInvariantException.ts';


export class MyBalanceCommand extends GuildCommand {
    protected replyUtility: ReplyUtility;
    
    public  constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    Commands = {
        Balance: "balance",
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            if (!interaction.guildId)
                return interaction.reply({ content: 'Sorry, but I only work in guilds!' })

            this.replyUtility = new ReplyUtility(interaction, {
                ephemeral: true
            });
            
            const guildId: Snowflake = new Snowflake(interaction.guild!.id);
            const userId: Snowflake = new Snowflake(interaction.user.id);
            
            const requestorGuild: Guild = (await this.guildRepository.findOneAsync(guildId))
                || await this.createGuildAsync(guildId);

            const requestor: GuildUser = (await this.guildUserRepository.findOneByCompositeIdAsync(guildId, userId)) 
                || await this.createGuildUserAsync(guildId, userId);

            const showHistory: boolean = interaction.options.getBoolean('show_history') || false;
            const enabledCurrencies: CurrencyType[] = requestorGuild.currencyTypes
                .filter(type => type.enabled);

            if (showHistory) {
                this.replyUtility.reply(builder => builder.addEntries(
                    requestor.ledger.entries.filter(entry => enabledCurrencies.some(enabledCurrency => enabledCurrency.id.equals(entry.currency.typeId))),
                    requestorGuild
                ));
            }
            else {
                this.replyUtility.reply(builder => {
                    builder.addLine(`__Your balances__:`);

                    return enabledCurrencies
                        .reduce((builder, currencyType) => builder.setCurrencyType(currencyType).addBalanceLine(requestor), builder);
                });
            }
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

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
      registry.registerChatInputCommand(builder => 
          builder
              .setName('balance')
              .setDescription('Check your XP balance.')
              .addBooleanOption(option => 
                  option
                      .setName('show_history')
                      .setDescription('Show a running log of your transaction history.')
                      .setRequired(false)
              )
        )
    }
}