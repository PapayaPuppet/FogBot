import  { ApplicationCommandRegistries, ApplicationCommandRegistry, Command, RegisterBehavior } from '@sapphire/framework'
import { APIRole, Collection, Role, SlashCommandBuilder, TextChannel, User } from 'discord.js'

import { GuildCommand } from './GuildCommand.ts'

import { Guild } from '#domain/Guild.ts'
import { Currency } from '#domain/Currency.ts'
import { CurrencyType } from '#domain/CurrencyType.ts'
import { GuildRoleClaim } from '#domain/GuildRoleClaim.ts'
import { GuildUser } from '#domain/GuildUser.ts'
import { Snowflake } from '#domain/Snowflake.ts'
import { Guid } from '#domain/Guid.ts'
import { Character } from '#domain/Character.ts'
import { ReplyBuilder, ReplyUtility } from '../utility/ReplyUtility.ts'
import { DomainInvariantError } from '#domain/DomainInvariantException.ts'
import { RoleClaimDTO } from '#domain/dto/RoleClaimDTO.ts'

export class AdminCommands extends GuildCommand {
    protected replyUtility: ReplyUtility;
    
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    public static Commands = {

        Claim: {
            List: "claim_list",
            Set: "claim_set", //create & alter, no difference yet
            Delete: "claim_delete",
        },

        Currency: {
            Create: "currency_create",
            Update: "currency_update"
        },

        User: {
            Balance: "user_balance",
            Currency: {
                Add: "user_currency_add",
                Deduct: "user_currency_deduct"
            }
        },

        Character: {
            Balance: "character_balance",
            Currency: {
                Add: "character_currency_add",
                Deduct: "character_currency_deduct",
                Spend: "character_currency_spend",
            }
        },

        Role: {
            Joinable: {
                Create: "joinable_role_add",
                Delete: "joinable_role_delete"
            },
            Currency: {
                Add: "role_add_currency"
            }
        },

        SetLogChannel: "log_channel_set", //channelId
    }
    
    
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            if (!interaction.inGuild)
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
            
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {

                case AdminCommands.Commands.User.Balance:
                    return await this.showBalanceAsync(interaction, requestorGuild);

                case AdminCommands.Commands.User.Currency.Deduct:
                    return await this.createUserDeductionEntryAsync(interaction, requestor, requestorGuild);

                case AdminCommands.Commands.User.Currency.Add:
                    return await this.createUserBonusEntryAsync(interaction, requestor, requestorGuild);

                case AdminCommands.Commands.Character.Currency.Add:
                    return await this.createCharacterBonusEntryAsync(interaction, requestor, requestorGuild);

                case AdminCommands.Commands.Character.Currency.Deduct:
                    return await this.createCharacterDeductionEntryAsync(interaction, requestor, requestorGuild);
                    
                case AdminCommands.Commands.Character.Currency.Spend:
                    return await this.createCharacterExpenditureEntryAsync(interaction, requestor, requestorGuild);

                case AdminCommands.Commands.Claim.List:
                    return await this.listClaimsAsync(interaction, requestorGuild);

                case AdminCommands.Commands.Claim.Set:
                    return await this.setClaimAsync(interaction, requestor, requestorGuild);

                case AdminCommands.Commands.Claim.Delete:
                    return await this.deleteClaimAsync(interaction, requestorGuild);
                
                case AdminCommands.Commands.Currency.Create:
                    return await this.createCurrencyAsync(interaction, requestorGuild);
                
                case AdminCommands.Commands.Currency.Update:
                    return await this.updateCurrencyAsync(interaction, requestorGuild);

                case AdminCommands.Commands.SetLogChannel:
                    return await this.setLogChannelAsync(interaction, requestorGuild);

                case AdminCommands.Commands.Role.Joinable.Create:
                    return await this.setRoleJoinabilityAsync(interaction, requestorGuild, true);

                case AdminCommands.Commands.Role.Joinable.Delete:
                    return await this.setRoleJoinabilityAsync(interaction, requestorGuild, false);
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

    async createUserBonusEntryAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const user: User = interaction.options.getUser('user', true);
        const reason: string = interaction.options.getString('reason', true);
        const quantity: number = interaction.options.getNumber('quantity', true);
        const currencyTypeId: Guid | undefined = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const guildUser: GuildUser = (await this.guildUserRepository.findOneByCompositeIdAsync(requestorGuild.guildId, new Snowflake(user.id))) 
            || await this.createGuildUserAsync(requestorGuild.guildId, new Snowflake(user.id));

        const initialQuantity: number = guildUser.ledger.getBalance(currencyTypeId);
        guildUser.addCurrency({ 
            currency: new Currency(currencyTypeId, quantity), 
            reason,
            requestorId: requestor.id
        });

        await this.guildUserRepository.saveAsync();

        const replyBuilder: ReplyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addGuildUserLedgerEntryLine(guildUser.userId, guildUser.ledger.entries.pop()!)
            .addBalanceChangeLine(initialQuantity, guildUser.ledger.getBalance(currencyTypeId));

        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(
            requestorGuild, 
            replyBuilder.setActionInitiator(new Snowflake(user.id)).build()
        );
    }

    async createUserDeductionEntryAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const user: User = interaction.options.getUser('user', true);
        const reason: string = interaction.options.getString('reason', true);
        const currencyTypeId: Guid = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const quantity: number = interaction.options.getNumber('quantity', true);
        const currency: Currency = new Currency(currencyTypeId!, quantity > 0 ? quantity * -1 : quantity);

        const guildUser: GuildUser = (await this.guildUserRepository.findOneByCompositeIdAsync(requestorGuild.guildId, new Snowflake(user.id))) 
            || await this.createGuildUserAsync(requestorGuild.guildId, new Snowflake(user.id));

        const initialQuantity: number = guildUser.ledger.getBalance(currencyTypeId);
        guildUser.deductCurrency({ 
            currency, 
            reason,
            requestorId: requestor.id
        });

        await this.guildUserRepository.saveAsync();

        const replyBuilder: ReplyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addGuildUserLedgerEntryLine(guildUser.userId, guildUser.ledger.entries.pop()!)
            .addBalanceChangeLine(initialQuantity, guildUser.ledger.getBalance(currencyTypeId));

        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(
            requestorGuild, 
            replyBuilder.setActionInitiator(new Snowflake(user.id)).build()
        );
    }

    async createCharacterBonusEntryAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        let characterId: Guid = Guid.isValid(interaction.options.getString('character'))
            ? new Guid(interaction.options.getString('character', true)) 
            : await this.promptForValidCharacterIdByGuild(interaction, requestorGuild);

        const reason: string = interaction.options.getString('reason', true);
        const quantity: number = interaction.options.getNumber('quantity', true);
        const currencyTypeId: Guid = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const character: Character = (await this.characterRepository.findOneAsync(characterId))!;

        const initialQuantity: number = character.ledger.getBalance(currencyTypeId);
        character.addCurrency({ 
            currency: new Currency(currencyTypeId, quantity), 
            reason,
            requestorId: requestor.id
        });

        await this.characterRepository.saveAsync();

        const replyBuilder: ReplyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addCharacterLedgerEntryLine(character.name, character.ledger.entries.pop()!)
            .addBalanceChangeLine(initialQuantity, character.ledger.getBalance(currencyTypeId));

        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(
            requestorGuild, 
            replyBuilder.setActionInitiator(new Snowflake(interaction.user.id)).build()
        );
    }

    async createCharacterDeductionEntryAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        let characterId: Guid = Guid.isValid(interaction.options.getString('character'))
            ? new Guid(interaction.options.getString('character', true)) 
            : await this.promptForValidCharacterIdByGuild(interaction, requestorGuild);

        const reason: string = interaction.options.getString('reason', true);
        const quantity: number = interaction.options.getNumber('quantity', true);
        const currencyTypeId: Guid = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const character: Character = (await this.characterRepository.findOneAsync(characterId))!;

        const initialQuantity: number = character.ledger.getBalance(currencyTypeId);
        character.deductCurrency({ 
            currency: new Currency(currencyTypeId, quantity), 
            reason,
            requestorId: requestor.id
        });

        await this.characterRepository.saveAsync();

        const replyBuilder: ReplyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addCharacterLedgerEntryLine(character.name, character.ledger.entries.pop()!)
            .addBalanceChangeLine(initialQuantity, character.ledger.getBalance(currencyTypeId));

        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(
            requestorGuild, 
            replyBuilder.setActionInitiator(new Snowflake(interaction.user.id)).build()
        );
    }

    async createCharacterExpenditureEntryAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        let characterId: Guid = Guid.isValid(interaction.options.getString('character'))
            ? new Guid(interaction.options.getString('character', true)) 
            : await this.promptForValidCharacterIdByGuild(interaction, requestorGuild);

        const reason: string = interaction.options.getString('reason', true);
        const quantity: number = interaction.options.getNumber('quantity', true);
        const currencyTypeId: Guid | undefined = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        const currency: Currency = new Currency(currencyTypeId!, quantity > 0 ? quantity * -1 : quantity);

        const character: Character = (await this.characterRepository.findOneAsync(characterId))!;

        const initialQuantity: number = character.ledger.getBalance(currencyTypeId);
        character.spendCurrency({
            currency, 
            reason,
            requestorId: requestor.id
        });

        await this.characterRepository.saveAsync();

        const replyBuilder: ReplyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addCharacterLedgerEntryLine(character.name, character.ledger.entries.pop()!)
            .addBalanceChangeLine(initialQuantity, character.ledger.getBalance(currencyTypeId));

        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(
            requestorGuild, 
            replyBuilder.setActionInitiator(new Snowflake(interaction.user.id)).build()
        );
    }


    async listClaimsAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const roles: Collection<string, Role> = await interaction.guild!.roles.fetch();

        const roleClaims: RoleClaimDTO[] = requestorGuild.roleClaims.filter(claim => roles.has(claim.roleId.value));

        const content: string = roleClaims
            .sort((a, b) => {
                const aRoleName: string = roles.get(a.roleId.value)!.name
                const bRoleName: string = roles.get(b.roleId.value)!.name
                
                if (aRoleName < bRoleName) return -1
                else if (aRoleName > bRoleName) return 1
                else {
                    if (a.currencyTypeName < b.currencyTypeName) return -1 //no two claims of the same currency type should share the same role
                    else return 1
                }
            })
            .reduce((contentStr, claim, idx) => {
                contentStr += `<@&${claim.roleId}>: ${claim.quantity} ${claim.currencyTypeName}`
                contentStr += idx === roleClaims.length - 1 ? '' : '\n'
                return contentStr
            }, '');

        return interaction.reply({
            content: content,
            ephemeral: true
        });
    }

    async setClaimAsync(interaction: Command.ChatInputCommandInteraction, requestor: GuildUser, requestorGuild: Guild): Promise<any> {
        const role: Role | APIRole = interaction.options.getRole('role', true);
        const quantity: number = interaction.options.getNumber('quantity', true);

        const currencyTypeId: Guid | undefined = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);
        const previousClaim: RoleClaimDTO | undefined = requestorGuild.roleClaims.find(claim => claim.roleId.equals(role.id) && claim.currencyTypeId.equals(currencyTypeId));
        const roleId: Snowflake = new Snowflake(role.id);

        if (!!previousClaim) 
            requestorGuild.updateRoleClaimQuantity(roleId, new Currency(currencyTypeId, quantity));
        else 
            requestorGuild.createRoleClaim(roleId, new Currency(currencyTypeId, quantity));

        await this.guildRepository.saveAsync();

        const replyBuilder = ReplyBuilder.new()
            .setCurrencyTypeById(currencyTypeId, requestorGuild)
            .addLine(builder => `A claim for role <@&${role.id}> has been ${!!previousClaim ? 'updated' : 'created'}: ${quantity} ${builder.currencyType.name}`)
            .addLine(builder => !!previousClaim ? `\nPrevious Value: ${previousClaim.quantity} ${builder.currencyType.name}` : '');
        
        this.replyUtility.reply(replyBuilder.build());
        await this.replyUtility.logAsync(requestorGuild, replyBuilder
            .setActionInitiator(new Snowflake(interaction.user.id))
            .build()
        );
    }

    async deleteClaimAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const claimId: Guid = requestorGuild.roleClaims.find(claim => claim.id.equals(interaction.options.getString('claim', true)))?.id
            || await this.promptForValidClaim(interaction, requestorGuild);

        const claim: RoleClaimDTO = requestorGuild.roleClaims.find(claim => claim.id.equals(claimId))!;

        requestorGuild.deleteRoleClaim(claim.roleId, claim.id);
        await this.guildRepository.saveAsync();

        const replyBuilder = ReplyBuilder.new()
            .addLine(`A claim for role <@&${claim.roleId.value}> has been deleted.`)
            .addLine(`Previous Value: ${claim.quantity} ${requestorGuild.currencyTypes.find(type => type.id.equals(claim.currencyTypeId))!.name}`);
        
        this.replyUtility.reply(replyBuilder.build(), interaction.deferred);

        await this.replyUtility.logAsync(requestorGuild, replyBuilder
            .setActionInitiator(new Snowflake(interaction.user.id))
            .build()
        );
    }

    async createCurrencyAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const currencyName: string = interaction.options.getString('name', true);

        requestorGuild.createCurrencyType(currencyName);
        await this.guildRepository.saveAsync();
    
        this.replyUtility.reply(`A new currency, ${currencyName}, has been created.`);
        await this.replyUtility.logAsync(requestorGuild, `A new currency, ${currencyName}, has been created by <@${interaction.user.id}>.`);
    }

    async updateCurrencyAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const enabled: boolean = interaction.options.getBoolean('enabled', true);
        const currencyTypeId: Guid | undefined = requestorGuild.currencyTypes.find(type => type.id.equals(interaction.options.getString('currency', true)))?.id
            || await this.promptForValidCurrencyAsync(interaction, requestorGuild);

        requestorGuild.updateCurrencyType(currencyTypeId, enabled);
        await this.guildRepository.saveAsync();

        const currencyName: string = requestorGuild.currencyTypes.find(type => type.id.equals(currencyTypeId))!.name;
        this.replyUtility.reply(`Currency ${currencyName} was ${enabled ? 'enabled' : 'disabled'}.`);
        await this.replyUtility.logAsync(requestorGuild, `Currency ${currencyName} was ${enabled ? 'enabled' : 'disabled'} by <@${interaction.user.id}>.`);
    }

    async setLogChannelAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        requestorGuild.logChannelId = new Snowflake(interaction.options.getChannel('channel', true).id)
        await this.guildRepository.saveAsync()

        interaction.reply({ content: `Set <#${requestorGuild.logChannelId.value}> for logging.`, ephemeral: true })
        await this.replyUtility.logAsync(requestorGuild, `<@${interaction.user.id}> set this channel for logging!`)
    }

    async showBalanceAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const user: User = interaction.options.getUser('user', true)

        const guildUser: GuildUser | undefined = await this.guildUserRepository.findOneByCompositeIdAsync(requestorGuild.guildId, new Snowflake(user.id));

        if (!guildUser)
            return interaction.reply({ content: 'No user matching your input was found in my records.', ephemeral: true })
        
        this.replyUtility.reply(builder => {
            builder.addLine(`__<@${user.id}>'s balances__:`);
            
            return requestorGuild.currencyTypes
                .filter(type => type.enabled)
                .reduce((builder, currencyType) => builder.setCurrencyType(currencyType).addBalanceLine(guildUser), builder);
        })
    }

    async setRoleJoinabilityAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild, joinable: boolean): Promise<any> {
        const role: Role | APIRole = interaction.options.getRole('role', true);
        const roleId: Snowflake = new Snowflake(role.id);

        if (!joinable && !requestorGuild.hasRole(roleId))
            return this.replyUtility.reply('This role already is not joinable.');

        if (!requestorGuild.hasRole(roleId))  
            requestorGuild.createRole(roleId, false);
            
        requestorGuild.setRoleJoinable(roleId, joinable);
        await this.guildRepository.saveAsync();
        
        this.replyUtility.reply(`<@&${role.id}> has been made joinable.`);
        await this.replyUtility.logAsync(requestorGuild, builder => {

            builder.setActionLine(`<@&${role.id}> is now joinable.`)
                   .setActionInitiator(new Snowflake(interaction.user.id))
                   .addLine(`\nJoinable Roles:`);

            return requestorGuild.roles
                .filter(role => role.joinable)
                .reduce((builder, role) => builder.addLine(`<@&${role.roleId.value}>`), builder);
        });
    }
    

    createBaseSlashCommandStructure(builder: SlashCommandBuilder) {
        return builder
            .setName('admin')
            .setDescription('Access admin tools.')
            .addSubcommand(subcommand => 
                subcommand
                    .setName(AdminCommands.Commands.Currency.Create)
                    .setDescription('Create a new type of currency for this guild.')
                    .addStringOption(option => 
                        option
                            .setName('name')
                            .setDescription('Name of the new currency. Must be unique for this guild.')
                            .setRequired(true)
                    )
            )

            .addSubcommand(subcommand =>
                subcommand
                    .setName(AdminCommands.Commands.SetLogChannel)
                    .setDescription('Set the channel for which to post all change logs for this guild.')
                    .addChannelOption(option => 
                        option
                        .setName('channel')
                        .setDescription('Channel to post logs to.')
                        .setRequired(true)
                    )
            )
    }

    async registerGuildSpecificCurrencyOptions(registry: ApplicationCommandRegistry, guildIds: string[]): Promise<void> {

        registry.registerChatInputCommand(builder => {
            this.createBaseSlashCommandStructure(builder)
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.User.Balance)
                        .setDescription('Check a user\'s currency balances.')
                        .addUserOption(option => 
                            option
                                .setName('user')
                                .setDescription('User to view.')
                                .setRequired(true)
                        )
                        .addBooleanOption(option => 
                            option
                                .setName('show_history')
                                .setDescription('Show a running log of user\'s transaction history.')
                                .setRequired(false)
                        )
                )


                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Claim.List)
                        .setDescription('List all role claims.')
                )

                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Claim.Set)
                        .setDescription('Create or update a role claim.')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('The role for the claim.')
                                .setRequired(true)
                        )
                        .addStringOption(option => 
                            option
                                .setName('currency')
                                .setDescription('The currency for the claim.')
                                .setAutocomplete(true)
                                .setRequired(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('The quantity of currency claimable.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Claim.Delete)
                        .setDescription('Delete a role claim.')
                        .addStringOption(option => 
                            option
                                .setName('claim')
                                .setDescription('The claim to delete.')
                                .setAutocomplete(true)
                                .setRequired(true)
                        )
                )

                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Currency.Update)
                        .setDescription('Update a currency for this guild.')
                        .addStringOption(option => 
                            option
                                .setName('currency')
                                .setDescription('Name of the new currency.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addBooleanOption(option => 
                            option
                                .setName('enabled')
                                .setDescription('When disabled, this currency will not show up in commands or be usable.')
                                .setRequired(true)
                        )
                )

                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.User.Currency.Add)
                        .setDescription('Add a currency to a user\'s balance.')
                        .addUserOption(option => 
                            option
                                .setName('user')
                                .setDescription('User to add to.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to add.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to add.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being added.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.User.Currency.Deduct)
                        .setDescription('Deduct a currency from a user\'s balance.')
                        .addUserOption(option => 
                            option
                                .setName('user')
                                .setDescription('User to remove from.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to deduct.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to add.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being removed.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Character.Currency.Add)
                        .setDescription('Adds a currency to a character\'s balance.')
                        .addStringOption(option => 
                            option
                                .setName('character')
                                .setDescription('Character to add to.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to add.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to add.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being added.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Character.Currency.Deduct)
                        .setDescription('Deducts a currency from a character\'s balance.')
                        .addStringOption(option => 
                            option
                                .setName('character')
                                .setDescription('Character to deduct from.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to deduct.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to deduct.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being deducted.')
                                .setRequired(true)
                        )
                )
                
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Character.Currency.Spend)
                        .setDescription('Spends a currency from a character\'s balance.')
                        .addStringOption(option => 
                            option
                                .setName('character')
                                .setDescription('Character to spend from.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to spend.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to spend.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being spent.')
                                .setRequired(true)
                        )
                )
    
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Role.Currency.Add)
                        .setDescription('For all users within a role, add a currency to all user balances.')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('Role to add to.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('currency')
                                .setDescription('Choose what type of currency balance to add.')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addNumberOption(option => 
                            option
                                .setName('quantity')
                                .setDescription('Amount of currency to add.')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Why the currency is being added.')
                                .setRequired(true)
                        )
                )

                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Role.Joinable.Create)
                        .setDescription('Create a role that users can join via slash command.')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('Role to make joinable.')
                                .setRequired(true)
                        )
                )

                .addSubcommand(subcommand => 
                    subcommand
                        .setName(AdminCommands.Commands.Role.Joinable.Delete)
                        .setDescription('Remove a role that users can join via slash command.')
                        .addRoleOption(option => 
                            option
                                .setName('role')
                                .setDescription('Role to make no longer joinable.')
                                .setRequired(true)
                        )
                )
        }, {
            guildIds: guildIds,
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite
        })
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        registry.registerChatInputCommand(builder => this.createBaseSlashCommandStructure(builder))

        /*this.guildRepository.toArrayAsync()
            .then(guilds => {
                this.registerGuildSpecificCurrencyOptions(registry, guilds.map(guild => guild.id))
            })*/

        this.registerGuildSpecificCurrencyOptions(registry, ['903671387892383774'])
        
    }
}