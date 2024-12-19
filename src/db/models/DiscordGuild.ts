import { BaseModel } from './database.ts'
import { column } from "@adonisjs/lucid/orm";

export class DiscordGuild extends BaseModel {
    public static table = "DiscordGuild"

    @column({isPrimary: true})
    public id: string

    @column()
    public discordSnowflake: bigint
}