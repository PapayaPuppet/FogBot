import { defineConfig, PostgreSqlDriver } from "@mikro-orm/postgresql";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(path.resolve(), "./.env")});

const config = defineConfig({
    entities: ['./src/db/schema', './src/db/schema/types'],
    entitiesTs: ['./src/db/schema', './src/db/schema/types'],
    metadataProvider: TsMorphMetadataProvider,
    driver: PostgreSqlDriver,
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: !!process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    onQuery: (sql: string, params: unknown[]) => {
        sql = sql.replace('LIKE', 'ILIKE')
        return sql;
    }
});

export default config;