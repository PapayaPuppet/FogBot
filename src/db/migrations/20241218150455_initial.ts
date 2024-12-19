import type { Knex } from "knex"

//import { Currency } from '../models/Currency.ts'

enum TransactionType {
    Monthly = 'MonthlyClaim',
    Bonus = 'Bonus',
    Expenditure = 'Expenditure',
    Penalty = 'Penalty'
}

enum Currency {
    XP = 'XP'
}

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createSchemaIfNotExists('bot')
        .withSchema('bot')
        .createTable('DiscordGuild', (table) => {
            table.uuid('id').primary()

            table.bigint('discordSnowflake').unique().notNullable()

            table.string('name', 100).notNullable()
        })

        .createTable('DiscordUser', (table) => {
            table.uuid('id').primary()

            table.bigint('discordSnowflake').unique().notNullable()

            table.string('globalName', 64).notNullable()
        })
        
        .createTable('GuildUser', (table) => {
            table.uuid('id').primary()

            table.uuid('discordUserId').references('id').inTable('bot.DiscordUser').notNullable()

            table.uuid('guildId').references('id').inTable('bot.DiscordGuild').notNullable()

            table.unique(['discordUserId', 'guildId'])
        })

        .createTable('DiscordChannel', (table) => {
            table.uuid('id').primary()

            table.uuid('guildId').references('id').inTable('bot.DiscordGuild').notNullable()

            table.bigint('discordSnowflake').unique().notNullable()

            table.string('name', 100).notNullable()
        })

        .createTable('TransactionLogChannel', (table) => {
            table.uuid('id').primary()

            table.uuid('channelId').unique().references('id').inTable('bot.DiscordChannel').notNullable()
        })

        /*.createTable('Currency', (table) => {
            table.uuid('id', {
                primaryKey: true
            })

            table.string('name', 32)

            table.unique('name')
        })*/

        .createTable('DiscordRole', (table) => {
            table.uuid('id').primary()

            table.bigint('discordSnowflake').unique().notNullable()

            table.string('name', 100).notNullable()
        })

        /*.createTable('TransactionType', (table) => {
            table.uuid('id', {
                primaryKey: true
            })

            table.string('name', 32)

            table.unique('name')
        })*/

        .createTable('MonthlyClaim', (table) => {
            table.uuid('id').primary()
            
            table.enum('currency', Object.values(Currency), {
                useNative: true,
                existingType: false,
                enumName: 'Currency'
            }).notNullable()
            
            table.uuid('roleId').references('id').inTable('bot.DiscordRole').notNullable()

            table.smallint('quantity').notNullable()

            table.unique(['currency', 'roleId'])
        })

        .createTable('Transaction', (table) => {
            table.uuid('id').primary()
            
            table.uuid('userId').references('id').inTable('bot.GuildUser').notNullable()
            
            table.enum('currency', null, {
                useNative: true,
                existingType: true,
                enumName: 'Currency'
            }).notNullable()

            table.enum('type', Object.values(TransactionType), {
                useNative: true,
                enumName: 'TransactionType'
            }).notNullable()

            table.smallint('quantity').notNullable()

            table.string('notes', 512).notNullable()

            table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable();
        })
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .withSchema('bot')
        .dropTable('Transaction')
        .dropTable('MonthlyClaim')
        .dropTable('GuildUser')
        .dropTable('DiscordUser')
        .dropTable('TransactionLogChannel')
        .dropTable('DiscordChannel')
        .dropTable('DiscordGuild')
        .dropTable('DiscordRole')
        .raw('drop type bot."Currency"')
        .raw('drop type bot."TransactionType"')
        .dropSchema('bot')
}

