import { BaseModel } from './database.ts'
import { column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'

import { DiscordChannel } from '#dbModels'

export class TransactionLogChannel extends BaseModel {
    public static table = "transactionLogChannel"

    @column({ isPrimary: true })
    public id: string

    @column()
    public channelId: string
        
    @hasOne(() => DiscordChannel)
    declare discordChannel: HasOne<typeof DiscordChannel>
}