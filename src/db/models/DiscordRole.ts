import { BaseModel } from './database.ts'
import { column } from "@adonisjs/lucid/orm";

export class DiscordRole extends BaseModel {
    public static table = "discordRole"

    @column({ isPrimary: true })
    public id: string

    @column()
    public discordSnowflake: bigint
}