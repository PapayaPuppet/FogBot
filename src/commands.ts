import  { Command } from '@sapphire/framework'


enum CurrencyType {
    XP = 'XP',
    Secondary = 'Secondary'
}


function monthlyClaim(registry: Command.Registry)
{
    registry.registerChatInputCommand(builder => 
        builder
            .setName('claim')
            .setDescription('Claim your monthly XP.')
    )
}


function myBalanceCommand(registry: Command.Registry)
{
    registry.registerChatInputCommand(builder => 
        builder
            .setName('balance')
            .setDescription('Check your XP balance.')
            .addBooleanOption(option => 
                option
                    .setName('showHistory')
                    .setDescription('Show a running log of your transaction history.')
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
                        { name: 'all', value: '' }
                    )
            )
    )
}

function adminCommands(registry: Command.Registry)
{
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
                            .setName('showHistory')
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
                                { name: 'all', value: '' }
                            )
                    )
            )


            .addSubcommand(subcommand => 
                subcommand
                    .setName('addCurrencyToPlayer')
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
                    .setName('addCurrencyToRole')
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
                    .setName('removeCurrencyFromPlayer')
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
                    .setName('setMonthlyClaim')
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
                    )
            )
    )
}
