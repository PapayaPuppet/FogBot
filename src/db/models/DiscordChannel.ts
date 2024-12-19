import { BaseModel } from './database.ts'
import { column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'

import { DiscordGuild } from '#dbModels'

export class DiscordChannel extends BaseModel {
    public static table = "discordChannel"

    @column({ isPrimary: true })
    public id: string

    @column()
    public guildId: string

    @column()
    public discordSnowflake: bigint

    @column()
    public name: string

    @hasOne(() => DiscordGuild)
    declare discordGuild: HasOne<typeof DiscordGuild>
}