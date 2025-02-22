import  { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { GuildCommand as GuildCommand } from './GuildCommand.ts'
import { Snowflake } from '#domain/Snowflake.ts';
import { ReplyUtility } from '#root/utility/ReplyUtility.ts';
import { Guild } from '#domain/Guild.ts';
import { DomainInvariantError } from '#domain/DomainInvariantException.ts';
import { APIRole, GuildMember, Role } from 'discord.js';

export class RoleCommand extends GuildCommand {
    protected replyUtility: ReplyUtility;
    
    public  constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    public static Commands = {
        List: "list",
        Join: "join"
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            if (!interaction.guildId)
                return interaction.reply({ content: 'Sorry, but I only work in guilds!' })

            this.replyUtility = new ReplyUtility(interaction, {
                ephemeral: true
            });
            
            const guildId: Snowflake = new Snowflake(interaction.guild!.id);
            
            const requestorGuild: Guild = (await this.guildRepository.findOneAsync(guildId))
                || await this.createGuildAsync(guildId);
            
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case RoleCommand.Commands.List:
                    return this.listJoinableRolesAsync(interaction, requestorGuild);

                case RoleCommand.Commands.Join:
                    return this.joinRoleAsync(interaction, requestorGuild);
            }
        }
        catch (error: any) {
            console.error(error);
            if (error instanceof DomainInvariantError) {
                return this.replyUtility.reply(error.message);
            }
            else {
                return interaction.reply({
                    content: 'That didn\'t work, something went wrong unexpectedly.',
                    ephemeral: true
                });
            }
        }
    }

    async listJoinableRolesAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        this.replyUtility.reply(builder => 
            requestorGuild.roles.reduce((builder, role) => builder.addLine(`<@&${role.roleId.value}>`), builder)
        );
    }

    async joinRoleAsync(interaction: Command.ChatInputCommandInteraction, requestorGuild: Guild): Promise<any> {
        const roleId: Snowflake = requestorGuild.hasRole(new Snowflake(interaction.options.getString('role', true)))
            ? new Snowflake(interaction.options.getString('role', true))
            : await this.promptForValidJoinableRole(interaction, requestorGuild);

        if (requestorGuild.roles.some(role => role.roleId.equals(roleId) && !role.joinable))
            return this.replyUtility.reply('Sorry, the selected role is not joinable.'); //no brute force ids

        const role: Role | APIRole = interaction.guild!.roles.cache.get(roleId.value)!;
        const member: GuildMember = interaction.guild!.members.cache.get(interaction.user.id)!;

        if (member.roles.cache.has(roleId.value))
            return this.replyUtility.reply('You are already a member of this role.');

        await member.roles.add(roleId.value);
        
        this.replyUtility.reply(`You have been added to <@&${roleId.value}>.`);
        await this.replyUtility.logAsync(requestorGuild, `${member.nickname || member.user.globalName || member.user.username} has been added to ${role.name}`);
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
      registry.registerChatInputCommand(builder => 
          builder
              .setName('role')
              .setDescription('View and join roles.')
              
              .addSubcommand(subcommand => 
                    subcommand
                        .setName(RoleCommand.Commands.List)
                        .setDescription('Show roles that can be joined.')
                )
              
                .addSubcommand(subcommand => 
                    subcommand
                        .setName(RoleCommand.Commands.Join)
                        .setDescription('Join a role.')
                        .addStringOption(option => 
                            option
                                .setName('role')
                                .setDescription('Role to join')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        )
    }
}