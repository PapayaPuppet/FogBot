import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { APIRole, Guild, Role, User } from 'discord.js'
import { CurrencyType } from '../models/Currency.js'




export class AdminCommands extends Command {

    Commands = {
        SetMonthlyClaim: "set_monthly_claim",
        UserBalance: "balance"
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
      registry.registerChatInputCommand(builder => 
          builder
              .setName('admin')
              .setDescription('Access admin tools.')
  
  
              .addSubcommand(subcommand => 
                  subcommand
                      .setName('balance')
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
                      .addStringOption(option =>
                          option
                              .setName('currency')
                              .setDescription('Choose what type of currency balance to display. Defaults to show all.')
                              .setRequired(false)
                              .addChoices(
                                  { name: 'XP', value: 'XP' },
                                  { name: 'Secondary', value: 'Secondary' },
                                  { name: 'all', value: 'All' }
                              )
                      )
              )
  
  
              .addSubcommand(subcommand => 
                  subcommand
                      .setName('add_currency_to_player')
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
                              .addChoices(
                                  { name: 'XP', value: 'XP' },
                                  { name: 'Secondary', value: 'Secondary' }
                              )
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
                      .setName('add_currency_to_role')
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
                              .addChoices(
                                  { name: 'XP', value: 'XP' },
                                  { name: 'Secondary', value: 'Secondary' }
                              )
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
                      .setName('remove_currency_to_role')
                      .setDescription('Remove/spend a currency from a user\'s balance.')
                      .addUserOption(option => 
                          option
                              .setName('user')
                              .setDescription('User to remove from.')
                              .setRequired(true)
                      )
                      .addStringOption(option =>
                          option
                              .setName('currency')
                              .setDescription('Choose what type of currency balance to add.')
                              .setRequired(true)
                              .addChoices(
                                  { name: 'XP', value: 'XP' },
                                  { name: 'Secondary', value: 'Secondary' }
                              )
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
                      .setName('set_monthly_claim')
                      .setDescription('Set the quantity of currency a user role will get with their monthly claim.')
                      .addRoleOption(option => 
                          option
                              .setName('role')
                              .setDescription('Role to set the monthly claim for.')
                              .setRequired(true)
                      )
                      .addStringOption(option =>
                          option
                              .setName('currency')
                              .setDescription('Choose what type of currency to set the monthly claim amount for.')
                              .setRequired(true)
                              .addChoices(
                                  { name: 'XP', value: 'XP' },
                                  { name: 'Secondary', value: 'Secondary' }
                              )
                      )
                      .addIntegerOption(option => 
                          option
                              .setName('quantity')
                              .setDescription('Amount of currency for user in role to claim.')
                              .setRequired(true)
                      )
              )
        )
    }
    
    
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const guild: Guild | null = interaction.guild
        const user: User = interaction.user

        interaction.member?.roles
        const options = interaction.options

        if (options.getSubcommand() === this.Commands.SetMonthlyClaim) {
            console.log('MONTHLY CLAIM')
            const msg = await interaction.reply({
                content: 'Updating...',
                ephemeral: true
            })
/*
            try {
                const role: Role | APIRole = options.getRole('role', true) 
                const currency: CurrencyType = CurrencyType[options.getString('currency', true) as keyof typeof CurrencyType]
                const quantity: number = options.getInteger('quantity', true)
    
                const result = await setMonthlyClaim(role.id, currency, quantity)
    
                console.log(result)
                const reply: string = `Set monthly claim for ${role.name} and ${currency} to ${result.quantity}`
    
                return interaction.editReply(reply)
            }
            catch {
                return interaction.editReply('Unable to update monthly claim.')
            }*/
        }
    }
}