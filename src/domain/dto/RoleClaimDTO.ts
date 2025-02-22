import { Guid } from "#domain/Guid.ts"
import { Snowflake } from "#domain/Snowflake.ts"

export type RoleClaimDTO = {
    id: Guid
    roleId: Snowflake
    currencyTypeId: Guid
    currencyTypeName: string
    quantity: number
}