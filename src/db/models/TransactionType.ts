
/*
export class TransactionType extends BaseModel {
    public static table = "transactionType"

    @column({ isPrimary: true })
    public id: string

    @column()
    public name: string
}*/


export enum TransactionType {
    Monthly = 'MonthlyClaim',
    Bonus = 'Bonus',
    Expenditure = 'Expenditure',
    Penalty = 'Penalty'
}