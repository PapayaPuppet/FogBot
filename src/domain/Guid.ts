import { v4 as guid, validate as guidIsValid } from 'uuid'

export class Guid {
    protected readonly _value: string

    constructor(value: string) {
        if (!guidIsValid(value))
            throw new Error(`Cannot construct new Guid from invalid string: ${value}`);

        this._value = value;
    }

    public static new(): Guid {
        return new Guid(guid());
    }

    get value(): string {
        return this._value;
    }

    public static isValid(value: string | undefined | null): boolean {
        return guidIsValid(value);
    }

    public equals(other: Guid | string): boolean {
        if (typeof other === "string")
            return other === this.value;
        else if (other instanceof Guid)
            return other.value === this.value;

        return false;
    }
}