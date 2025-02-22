import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { GuildCommand } from "./GuildCommand.ts";
import { Snowflake } from "#domain/Snowflake.ts";
import { GuildUser } from "#domain/GuildUser.ts";
import { Character } from "#domain/Character.ts";
import { Guid } from "#domain/Guid.ts";
import { Guild } from "#domain/Guild.ts";
import { UserToCharacterTransferService } from "#domain/services/UserToCharacterTransferService.ts";
import { Currency } from "#domain/Currency.ts";
import { ReplyUtility } from "../utility/ReplyUtility.ts";
import { DomainInvariantError } from "#domain/DomainInvariantException.ts";

export class CharacterCommands extends GuildCommand {
    protected replyUtility: ReplyUtility;
    
    public  constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    Commands = {
        List: "list",
        Create: "create",
        Balance: "balance",
        Transfer: "transfer"
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            if (!interaction.guildId)
                return interaction.reply({ content: 'Sorry, but I only work in guilds!' });

            this.replyUtility = new ReplyUtility(interaction, {
                ephemeral: true
            });
            
            const guildId: Snowflake = new Snowflake(interaction.guild!.id);
            const userId: Snowflake = new Snowflake(interaction.user.id);

            let requestorGuild: Guild = (await this.guildRepository.findOneAsync(guildId))
                || await this.createGuildAsync(guildId);

            let requestor: GuildUser = (await this.guildUserRepository.findOneByCompositeIdAsync(guildId, userId)) 
                || await this.createGuildUserAsync(guildId, userId);

            switch (interaction.options.getSubcommand()) {
                case this.Commands.Create:
                    return await this.createCharacterAsync(interaction, requestor, requestorGuild);
                case this.Commands.List:
                    return await this.listCharactersAsync(interaction, requestor, requestorGuild);
                case this.Commands.Balance:
                    return await this.displayCharacterBalanceAsync(interaction, requestor, requestorGuild);
                case this.Commands.Transfer: 
                    return await this.transferCurrencyAsync(interaction, requestor, requestorGuild);
                default:
                    return interaction.reply({ content: 'This interaction has not been set up yet, sorry!', ephemeral: true })
            }
        }
        catch (error: any) {
            console.error(error)
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


    private async transferCurrencyAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const quantity: number = interaction.options.getNumber('quantity', true);
        const characterId: Guid = Guid.isValid(interaction.options.getString('character'))
            ? new Guid(interaction.options.getString('character', true)) 
            : await this.promptForValidCharacterIdByUser(interaction, requestor);

        let character: Character = (await this.characterRepository.findOneAsync(characterId))!;

        const currencyTypeId: Guid = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const userName: string = (await interaction.guild!.members.fetch(requestor.userId.value))?.displayName;

        const initialUserBalance = requestor.ledger.getBalance(currencyTypeId);
        const initialCharacterBalance = character.ledger.getBalance(currencyTypeId);

        [requestor, character] = await UserToCharacterTransferService.commitTransferAsync(
            requestor.id, 
            character?.id, 
            new Currency(currencyTypeId, quantity),
            `Transfer from ${userName} to ${character.name}.`,
            this.container.sqlClient
        );

        this.replyUtility.reply(builder => builder
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addLine((builder) => `Transferred ${quantity} ${builder.currencyType.name} to ${character.name}.`)
            .addLine(builder => `Your ${builder.currencyType.name}: ${initialUserBalance} -> ${requestor.ledger.getBalance(builder.currencyType.id)}`)
            .addLine(builder => `${character.name}'s ${builder.currencyType.name}: ${initialCharacterBalance} -> ${character.ledger.getBalance(builder.currencyType.id)}`)
        );

        await this.replyUtility.logAsync(requestorGuild, builder => builder
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addLine((builder) => `Transferred ${quantity} ${builder.currencyType.name} to ${character.name}.`)
            .addLine(builder => `${userName}'s ${builder.currencyType.name}: ${initialUserBalance} -> ${requestor.ledger.getBalance(builder.currencyType.id)}`)
            .addLine(builder => `${character.name}'s ${builder.currencyType.name}: ${initialCharacterBalance} -> ${character.ledger.getBalance(builder.currencyType.id)}`)
        );
    }

    private async listCharactersAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const characters: Character[] = await this.characterRepository.findAsync(requestor.ownedCharacterIds);

        this.replyUtility.reply(builder =>
            characters.reduce((builder, character) => builder.addLine(`- ${character.name}`), builder)
        )
    }


    private async displayCharacterBalanceAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const characterId: Guid = Guid.isValid(interaction.options.getString('character'))
            ? new Guid(interaction.options.getString('character', true)) 
            : await this.promptForValidCharacterIdByUser(interaction, requestor);
        const character: Character | undefined = await this.characterRepository.findOneAsync(characterId);

        if (!character)
            return interaction.reply({ content: 'No character matching your input was found in my records.', ephemeral: true })

        this.replyUtility.reply(builder => requestorGuild.currencyTypes
            .filter(type => type.enabled)
            .reduce((builder, currencyType) => 
                builder.setCurrencyType(currencyType).addBalanceLine(character), 
                builder.addLine(`__${character.name}'s balances__:`)
            ));
    }

    private async createCharacterAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const name: string = interaction.options.getString('name', true);
        
        const charactersLikeNameForGuild: Character[] = await this.characterRepository.findByNameAsync(new Snowflake(interaction.guild!.id), name);

        if (charactersLikeNameForGuild.some(character => character.name.toLowerCase() === name.toLowerCase()))
            return interaction.reply({ 
                content: 'Sorry, your character name is already taken for this guild.',
                ephemeral: true
            });

        this.characterRepository.add(Character.create(name, requestor.id));
        await this.characterRepository.saveAsync();

        this.replyUtility.reply(`Your character, ${name}, has been created!`);
        await this.replyUtility.logAsync(requestorGuild, `A new character, ${name}, has been created for <@${interaction.user.id}>.`);
    }

     public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        console.log('character registry')

        registry.registerChatInputCommand(builder => 
            builder
                .setName('character')
                .setDescription('Access character tools.')

                .addSubcommand(subcommand =>
                    subcommand
                        .setName(this.Commands.Create)
                        .setDescription('Create a new character.')
                        .addStringOption(option =>
                            option
                                .setName('name')
                                .setDescription('Your character\'s full name.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand =>
                    subcommand
                        .setName(this.Commands.List)
                        .setDescription('List your characters.')
                )

                .addSubcommand(subcommand =>
                    subcommand
                        .setName(this.Commands.Balance)
                        .setDescription('Check the balances for one of your characters.')
                        .addStringOption(option =>
                            option
                                .setName('character')
                                .setDescription('Your character.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                .addSubcommand(subcommand =>
                    subcommand
                        .setName(this.Commands.Transfer)
                        .setDescription('Transfer currency from yourself to one of your characters..')
                        .addStringOption(option =>
                            option
                                .setName('character')
                                .setDescription('Your character.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )

                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Currency to transfer.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )

                        .addNumberOption(option =>
                            option
                                .setName('quantity')
                                .setDescription('Quantity of currency to transfer.')
                                .setRequired(true)
                        )
                )
        ),
        ['903671387892383774']
     }
}