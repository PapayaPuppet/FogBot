import { BaseModel } from './database.ts'
import { column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import { TransactionType, GuildUser, Currency } from '#dbModels'

export class Transaction extends BaseModel {
    public static table = "transaction"

    @column({ isPrimary: true })
    public id: string

    @column()
    public currency: Currency

    @column()
    public userId: string

    @column()
    public type: TransactionType

    @column()
    public quantity: number

    @column()
    public notes: string
    
    @column.dateTime({ autoCreate: true }) 
    public createdAt: DateTime

    @hasOne(() => GuildUser)
    declare user: HasOne<typeof GuildUser>
}