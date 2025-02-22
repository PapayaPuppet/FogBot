import { MikroORM } from "@mikro-orm/postgresql"
import { container } from "@sapphire/framework";
import config from './mikro-orm.config.ts'

export let context: MikroORM

export async function initContext() {
    container.sqlClient = await MikroORM.init(config);
    return context;
}