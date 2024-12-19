import { BaseModel } from './database.ts'
import { column } from "@adonisjs/lucid/orm";

export class DiscordUser extends BaseModel {
    public static table = "DiscordUser"

    @column({ isPrimary: true })
    public id: string

    @column()
    public discordSnowflake: bigint
}