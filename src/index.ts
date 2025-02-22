import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import "reflect-metadata";
import dotenv from 'dotenv'
import path from 'path';

import { initContext } from './persistenceContext.ts';

dotenv.config({ path: path.join(process.cwd(), '.env') })

await initContext();

const client: SapphireClient = new SapphireClient({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    loadApplicationCommandRegistriesStatusListeners: true
 });

try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    client.logger.info(`Successfully logged in.`);
  } catch (error) {
    client.logger.error(error);
    await client.destroy();
    process.exit(1);
  }
