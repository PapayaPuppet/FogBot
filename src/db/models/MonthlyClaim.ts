import { BaseModel } from './database.ts'
import { column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'

import { DiscordRole, Currency } from '#dbModels'

export class MonthlyClaim extends BaseModel {
    public static table = "monthlyClaim"

    @column({ isPrimary: true })
    public id: string

    @column()
    public currencyId: string

    @column()
    public roleId: string

    @column()
    public quantity: number
    
    @hasOne(() => DiscordRole)
    declare discordRole: HasOne<typeof DiscordRole>
}