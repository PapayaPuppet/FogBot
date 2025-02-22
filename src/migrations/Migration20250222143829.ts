import { Migration } from '@mikro-orm/migrations';

export class Migration20250222143829 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "guild_role" add column "joinable" boolean not null default false;`);

    this.addSql(`alter table "character" alter column "name" type varchar(100) using ("name"::varchar(100));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "character" alter column "name" type citext using ("name"::citext);`);

    this.addSql(`alter table "guild_role" drop column "joinable";`);
  }

}
