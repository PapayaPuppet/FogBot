import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { Guild, User } from 'discord.js';

export class MonthlyClaimCommand extends Command { 
    
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

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const guild: Guild | null = interaction.guild
        const user: User = interaction.user

        //const dbGuild = await Guilds.getGuildAsync(guild!)
        //const dbUser = await Guilds.getUserAsync(guild!, user!)


    }
}