import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'

export class MyBalanceCommand extends Command {
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
    }
  }