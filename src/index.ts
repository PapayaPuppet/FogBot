import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, "../.env")})

const client: SapphireClient = new SapphireClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.login(process.env.DISCORD_BOT_TOKEN);
