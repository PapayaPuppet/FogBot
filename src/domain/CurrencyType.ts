import { Guid } from "./Guid.ts"

export class CurrencyType {
    public readonly id: Guid
    public readonly name: string
    public enabled: boolean

    constructor(id: Guid, name: string, enabled: boolean) {
        this.id = id;
        this.name = name;
        this.enabled = enabled;
    }
}