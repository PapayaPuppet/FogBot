import { BaseModel } from "./database.js";
import { column, hasOne } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { HasOne } from '@adonisjs/lucid/types/relations'

import { DiscordGuild, DiscordUser } from '#dbModels'


export class GuildUser extends BaseModel {
    public static table = "GuildUser"

    @column({isPrimary: true})
    public id: string

    @column()
    public discordUserId: string

    @column() 
    public guildId: string

    @column.dateTime({ autoCreate: true }) 
    public createdAt: DateTime

    @hasOne(() => DiscordGuild)
    declare guild: HasOne<typeof DiscordGuild>

    @hasOne(() => DiscordUser)
    declare discordUser: HasOne<typeof DiscordUser>
}