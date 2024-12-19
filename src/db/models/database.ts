import { defineConfig } from "clark-orm";
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, "../../../.env")})


export const { BaseModel, Event, Database } = defineConfig({
  connection: "postgres",
  connections: {
    postgres: {
      client: "pg",
      debug: true,
      useNullAsDefault: true,
      connection: process.env.DB_URL,
      migrations: {
          paths: ['../migrations']
      }
    }
  },
})