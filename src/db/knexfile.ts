import type { Knex } from "knex";
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, "../../.env")})

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */

const config: { [key: string]: Knex.Config } = {

  development: {
    client: 'postgresql',
    connection: process.env.DB_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts'
    }
  }
};

module.exports = config;
