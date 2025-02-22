import { DiscordSnowflake } from "@sapphire/snowflake";

export class Snowflake {
    protected readonly _value: string

    constructor(value: string | bigint) {
        DiscordSnowflake.deconstruct(value)
        this._value = value.toString();
    }

    get value(): string {
        return this._value;
    }

    public equals(other: Snowflake | string): boolean {
        if (typeof other === "string")
            return other === this.value;
        else if (other instanceof Snowflake)
            return other.value === this.value;

        return false;
    }
}