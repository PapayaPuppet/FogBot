import { GuildRoleClaim } from './GuildRoleClaim.ts'
import { CurrencyType } from './CurrencyType.ts'
import { Currency } from './Currency.ts'
import { Snowflake } from './Snowflake.ts'
import { Guid } from './Guid.ts'
import { DomainInvariantError } from './DomainInvariantException.ts'
import { GuildRole } from './GuildRole.ts'
import { RoleClaimDTO } from './dto/RoleClaimDTO.ts'
import { RoleDTO } from './dto/RoleDTO.ts'

type GuildProps = {
    id: Guid,
    guildId: Snowflake,
    roles: GuildRole[],
    currencyTypes: CurrencyType[],
    logChannelId?: Snowflake
};

export class Guild {
    public readonly id: Guid;
    public readonly guildId: Snowflake;
    protected _roles: GuildRole[] = [];
    protected _currencyTypes: CurrencyType[] = [];

    public logChannelId: Snowflake | undefined;

    protected constructor(props: GuildProps) {
        this.id = props.id;
        this.guildId = props.guildId;
        this._roles = props.roles;
        this._currencyTypes = props.currencyTypes;
        this.logChannelId = props.logChannelId;
    }

    public static create(guildId: Snowflake): Guild {
        return new Guild({
            id: Guid.new(),
            guildId: guildId,
            roles: [],
            currencyTypes: []
        });
    }

    public static reconstitute(props: GuildProps) {
        return new Guild(props);
    }

    get currencyTypes(): CurrencyType[] {
        return [...this._currencyTypes];
    }

    get roles(): RoleDTO[] {
        return this._roles.map(role => ({
            id: role.id,
            roleId: role.roleId,
            joinable: role.joinable
        }));
    }

    get roleClaims(): RoleClaimDTO[] {
        return this._roles.flatMap(role => 
            role.claims.map(claim => ({
                id: claim.id,
                roleId: role.roleId,
                currencyTypeId: claim.currency.typeId,
                currencyTypeName: this._currencyTypes.find(currencyType => currencyType.id.equals(claim.currency.typeId))!.name,
                quantity: claim.currency.quantity
            }))
        );
    }

    public hasRole(roleId: Snowflake): boolean {
        return this._roles.some(role => role.roleId.equals(roleId));
    }

    protected getRole(roleId: Snowflake): GuildRole {
        const role: GuildRole | undefined = this._roles.find(role => role.roleId.equals(roleId))

        if (!!role) return role;

        throw new Error(`A role with roleId ${roleId.value} does not exist on this guild.`);
    }

    createRole(roleId: Snowflake, joinable: boolean = false): void {
        if (this.hasRole(roleId))
            throw new DomainInvariantError(`Cannot create a new role as a role with id ${roleId.value} already exists on this guild.`);

        this._roles = [...this._roles, new GuildRole({ id: Guid.new(), roleId, joinable })];
    }

    setRoleJoinable(roleId: Snowflake, joinable: boolean): void {
        this.getRole(roleId).joinable = joinable;
    }

    createRoleClaim(roleId: Snowflake, currency: Currency): void {
        if (!this.hasRole(roleId))
            this.createRole(roleId);

        const role: GuildRole = this.getRole(roleId);

        if (role.claims.some(claim => claim.currency.typeId === currency.typeId))
            throw new DomainInvariantError(`Cannot create a new role claim as a claim for the same role and currency type already exist on this guild ${this.id}.`);

        role.createClaim(currency);
    }

    updateRoleClaimQuantity(roleId: Snowflake, currency: Currency): void {
        const role: GuildRole = this.getRole(roleId);
        role.updateClaim(currency);
    }

    deleteRoleClaim(roleId: Snowflake, claimId: Guid): void {
        const role: GuildRole = this.getRole(roleId);
        role.deleteClaim(claimId);
    }

    createCurrencyType(name: string): void {
        if (!!this._currencyTypes.find(type => type.name.toLowerCase() === name.toLowerCase()))
            throw new DomainInvariantError(`Unable to create new currency type, because ${name} already exists for this guild.`);

        const newType: CurrencyType = new CurrencyType(Guid.new(), name, true);

        this._currencyTypes = [...this._currencyTypes, newType];
    } 

    updateCurrencyType(id: Guid, enabled: boolean): void {
        const currency = this._currencyTypes.find(type => type.id.equals(id));

        if (!currency)
            throw new DomainInvariantError(`Cannot update a currency that does not exist on this guild.`);
            
        currency.enabled = enabled;
    }
}