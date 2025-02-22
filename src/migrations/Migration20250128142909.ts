import { Migration } from '@mikro-orm/migrations';

export class Migration20250128142909 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create type "LedgerEntryType" as enum ('Claim', 'Bonus', 'Expenditure', 'Deduction', 'Credit', 'Debit');`);
    this.addSql(`create table "guild" ("id" uuid not null, "discord_id" bigint not null, "log_channel_id" varchar(255) null, constraint "guild_pkey" primary key ("id"));`);

    this.addSql(`create table "guild_currency" ("id" uuid not null, "guild_id" uuid not null, "name" varchar(255) not null, "disabled_at" timestamptz null, constraint "guild_currency_pkey" primary key ("id"));`);

    this.addSql(`create table "guild_role" ("id" uuid not null, "discord_id" bigint not null, "guild_id" uuid not null, constraint "guild_role_pkey" primary key ("id"));`);

    this.addSql(`create table "role_claim" ("id" uuid not null, "guild_currency_id" uuid not null, "guild_role_id" uuid not null, "quantity" int not null, constraint "role_claim_pkey" primary key ("id"));`);

    this.addSql(`create table "user" ("id" uuid not null, "discord_id" bigint not null, constraint "user_pkey" primary key ("id"));`);

    this.addSql(`create table "guild_user" ("id" uuid not null, "guild_id" uuid not null, "user_id" uuid not null, constraint "guild_user_pkey" primary key ("id"));`);

    this.addSql(`create table "guild_user_ledger_entry" ("id" uuid not null, "guild_user_id" uuid not null, "currency_id" uuid not null, "for_role_id" bigint null, "type" "LedgerEntryType" not null, "quantity" int not null, "reason" varchar(255) not null, "created_at" timestamptz not null, "created_by_id" uuid not null, constraint "guild_user_ledger_entry_pkey" primary key ("id"));`);

    this.addSql(`create table "character" ("id" uuid not null, "name" varchar(100) not null, "owner_id" uuid not null, constraint "character_pkey" primary key ("id"));`);

    this.addSql(`create table "character_ledger_entry" ("id" uuid not null, "character_id" uuid not null, "currency_id" uuid not null, "type" "LedgerEntryType" not null, "quantity" int not null, "reason" varchar(255) not null, "created_at" timestamptz not null, "created_by_id" uuid not null, constraint "character_ledger_entry_pkey" primary key ("id"));`);

    this.addSql(`alter table "guild_currency" add constraint "guild_currency_guild_id_foreign" foreign key ("guild_id") references "guild" ("id") on update cascade;`);

    this.addSql(`alter table "guild_role" add constraint "guild_role_guild_id_foreign" foreign key ("guild_id") references "guild" ("id") on update cascade;`);

    this.addSql(`alter table "role_claim" add constraint "role_claim_guild_currency_id_foreign" foreign key ("guild_currency_id") references "guild_currency" ("id") on update cascade;`);
    this.addSql(`alter table "role_claim" add constraint "role_claim_guild_role_id_foreign" foreign key ("guild_role_id") references "guild_role" ("id") on update cascade;`);

    this.addSql(`alter table "guild_user" add constraint "guild_user_guild_id_foreign" foreign key ("guild_id") references "guild" ("id") on update cascade;`);
    this.addSql(`alter table "guild_user" add constraint "guild_user_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "guild_user_ledger_entry" add constraint "guild_user_ledger_entry_guild_user_id_foreign" foreign key ("guild_user_id") references "guild_user" ("id") on update cascade;`);
    this.addSql(`alter table "guild_user_ledger_entry" add constraint "guild_user_ledger_entry_currency_id_foreign" foreign key ("currency_id") references "guild_currency" ("id") on update cascade;`);
    this.addSql(`alter table "guild_user_ledger_entry" add constraint "guild_user_ledger_entry_created_by_id_foreign" foreign key ("created_by_id") references "guild_user" ("id") on update cascade;`);

    this.addSql(`alter table "character" add constraint "character_owner_id_foreign" foreign key ("owner_id") references "guild_user" ("id") on update cascade;`);

    this.addSql(`alter table "character_ledger_entry" add constraint "character_ledger_entry_character_id_foreign" foreign key ("character_id") references "character" ("id") on update cascade;`);
    this.addSql(`alter table "character_ledger_entry" add constraint "character_ledger_entry_currency_id_foreign" foreign key ("currency_id") references "guild_currency" ("id") on update cascade;`);
    this.addSql(`alter table "character_ledger_entry" add constraint "character_ledger_entry_created_by_id_foreign" foreign key ("created_by_id") references "guild_user" ("id") on update cascade;`);
  }

}
