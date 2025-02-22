import { Guid } from "#domain/Guid.ts"
import { Snowflake } from "#domain/Snowflake.ts"
import { GuildRoleClaim } from "#domain/GuildRoleClaim.ts"
import { Currency } from "#domain/Currency.ts";
import { DomainInvariantError } from "./DomainInvariantException.ts";



type GuildRoleProps = {
    id: Guid,
    roleId: Snowflake,
    joinable?: boolean,
    claims?: GuildRoleClaim[],
}

export class GuildRole {
    public readonly id: Guid;
    public readonly roleId: Snowflake;
    
    public joinable: boolean = false;

    protected _claims: GuildRoleClaim[] = [];

    public constructor(props: GuildRoleProps) {
        this.id = props.id;
        this.roleId = props.roleId;
        this.joinable = props.joinable || false;
        this._claims = props.claims || [];
    }

    get claims(): GuildRoleClaim[] {
        return [...this._claims];
    }

    public hasClaim(currencyTypeId: Guid): boolean {
        return this.claims.some(claim => claim.currency.typeId.equals(currencyTypeId));
    }

    public getClaim(currencyTypeId: Guid): GuildRoleClaim {
        const claim: GuildRoleClaim | undefined = this._claims.find(role => role.currency.typeId.equals(currencyTypeId))

        if (!!claim) return claim;

        throw new Error(`A role with currencyTypeId ${currencyTypeId.value} does not exist on this role.`);
    }

    public createClaim(currency: Currency): void {
        if (this.hasClaim(currency.typeId))
            throw new DomainInvariantError(`Cannot create a claim for this role as a claim with this currency already exists on the role.`);

        this._claims = [...this._claims, new GuildRoleClaim(Guid.new(), currency)];
    }

    public updateClaim(currency: Currency): void {
        const claim: GuildRoleClaim = this.getClaim(currency.typeId);
        claim.currency = new Currency(currency.typeId, currency.quantity);
    }

    public deleteClaim(claimId: Guid): void {
        this._claims = this._claims.filter(claim => !claim.id.equals(claimId));
    }
}