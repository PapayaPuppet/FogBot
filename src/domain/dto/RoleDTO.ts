import { Guid } from "#domain/Guid.ts"
import { Snowflake } from "#domain/Snowflake.ts"

export type RoleDTO = {
    id: Guid
    roleId: Snowflake
    joinable: boolean
}