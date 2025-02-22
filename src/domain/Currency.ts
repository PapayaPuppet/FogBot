import { Guid } from "./Guid.ts"

export class Currency {
    typeId: Guid
    quantity: number

    constructor(typeId: Guid, quantity: number) {
        this.typeId = typeId;
        this.quantity = quantity;

        Object.freeze(this);
    }
}