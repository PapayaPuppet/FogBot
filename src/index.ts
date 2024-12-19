import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv'
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') })

const client: SapphireClient = new SapphireClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.login(process.env.DISCORD_BOT_TOKEN);
