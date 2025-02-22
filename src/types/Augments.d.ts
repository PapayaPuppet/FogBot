import { MikroORM } from "@mikro-orm/postgresql";



declare module '@sapphire/pieces' {
    interface Container {
        //Postgre persistence client/context
        sqlClient: MikroORM
    }
}