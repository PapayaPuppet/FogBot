import { Character } from "#domain/Character.ts";
import { CurrencyType } from "#domain/CurrencyType.ts";
import { LedgerEntry, RoleClaimEntry } from "#domain/LedgerEntry.ts";
import { Guid } from "#domain/Guid.ts";
import { Guild } from "#domain/Guild.ts";
import { GuildUser } from "#domain/GuildUser.ts";
import { Snowflake } from "#domain/Snowflake.ts";
import { LedgerEntryType } from "#schema/LedgerEntryType.ts";
import { Command } from "@sapphire/framework";
import { InteractionReplyOptions, TextChannel } from "discord.js";
import 'core-js/proposals/array-grouping-v2';


type builderCallback = (builder: ReplyBuilder) => ReplyBuilder;


export class ReplyUtility {
    protected _interaction: Command.ChatInputCommandInteraction;
    protected _options: InteractionReplyOptions = { };

    constructor(interaction: Command.ChatInputCommandInteraction, replyOptions: InteractionReplyOptions) {
        this._interaction = interaction;
        this._options = replyOptions;
    }

    public reply(replyContent: string | builderCallback, deferred: boolean = false): void {
        const content: string = typeof replyContent === "string"
            ? replyContent as string 
            : (replyContent as builderCallback)(new ReplyBuilder('')).build()

        if (deferred) {
            this._interaction.editReply({
                content,
                ...this._options
            });
        } 
        else {
            this._interaction.reply({
                content,
                ...this._options
            });
        }
    }

    public async logAsync(guild: Guild, logContent: string | builderCallback): Promise<void> {
        if (!guild.logChannelId)
            return;
        
        const channel = await this._interaction.guild!.channels.fetch(guild.logChannelId.value) as TextChannel;

        if (channel) {
            await channel.send(typeof logContent === "string"
                ? logContent as string 
                : (logContent as builderCallback)(new ReplyBuilder('')).build()
            );
        }
    }

    public async replyAndLogAsync(guild: Guild, content: string | builderCallback, deferred: boolean = false): Promise<void> {
        this.reply(content, deferred);
        await this.logAsync(guild, content);
    }

    public createBuilder(initialContent: string = ''): ReplyBuilder {
        return new ReplyBuilder(initialContent);
    }
}


export class ReplyBuilder {
    protected _action: string | undefined;
    protected _initiatorId: Snowflake;
    protected _lines: string[] = [];

    constructor(initialContent: string = '') {
        this._lines = [initialContent];
    }

    public static new(initialContent: string = ''): ReplyBuilder {
        return new ReplyBuilder(initialContent);
    }

    public addLine(line: string | ((builder: typeof this) => string)): this {
        if (typeof line === "string")
             this._lines = [...this._lines, line as string];
        else
            this._lines = [...this._lines, (line as (builder: typeof this) => string)(this)];

        return this;
    }

    public setActionLine(action: string): this {
        this._action = action;
        return this;
    }

    public setActionInitiator(initiatorId: Snowflake): this {
        this._initiatorId = initiatorId;
        return this;
    }

    public setCurrencyType(currencyType: CurrencyType): CurrencyReplyBuilder {
        return new CurrencyReplyBuilder(this._lines, currencyType);
    }

    public setCurrencyTypeById(currencyTypeId: Guid, guild: Guild): CurrencyReplyBuilder {
        return new CurrencyReplyBuilder(this._lines, guild.currencyTypes.find(type => type.id.equals(currencyTypeId))!);
    }

    public addCodeBlockLine(line: string): this {
        return this.addLine(`\`${line}\``);
    }

    public addCodeBlockMulti(innerBuilderCallback: (newBuilder: ReplyBuilder) => ReplyBuilder): this {
        return this.addLine(`\`\`\`\n${innerBuilderCallback(new ReplyBuilder()).build()}\n\`\`\``);
    }

    //we need some alternate way to handle all this...
    public addEntries(entries: LedgerEntry[], guild: Guild): this {
        const maxEntryTypeLength: number = Math.max.apply(this, entries.map(entry => entry.type.length));
        const maxCurrencyNameLength: number = Math.max.apply(this, guild.currencyTypes.map(type => type.name.length));

        return Array.from(Map.groupBy(entries, (entry) => entry.createdAt.toDateString()).values()).reduce((builder, entryDateGroup) => {
            builder.addLine(`____<t:${Math.floor(entryDateGroup[0].createdAt.getTime() / 1000)}:D>____:`);
                    
            entryDateGroup.reduce((builder, entry) =>  {
                    const quantitySign: string = entry.currency.quantity >= 0 ? '+' : '';
                    const currencyName: string = guild.currencyTypes.find(type => type.id.equals(entry.currency.typeId))!.name;
                    
                    const entryTypePadding: string = ' '.repeat(maxEntryTypeLength - entry.type.length);
                    const currencyNamePadding: string = ' '.repeat(maxCurrencyNameLength - currencyName.length);
                    
                    return builder.addLine(`\`${entry.type + entryTypePadding} ${quantitySign + entry.currency.quantity} ${currencyName + currencyNamePadding}\` <t:${Math.floor(entry.createdAt.getTime() / 1000)}:t> ${entry.reason}`);
                }, 
                builder
            );

            return builder.addLine('');
        }, this);
    }

    public build(): string {
        return [
            this._action || '', 
            !!this._initiatorId ? `Initiated By: <@${this._initiatorId.value}>` : '',
            ...this._lines
        ]
        .filter(line => line.trim() != '')
        .reduce((content, line) => content + '\n' + line, '').trim();
    }
}

class CurrencyReplyBuilder extends ReplyBuilder {
    protected _currencyType: CurrencyType;

    constructor(lines: string[], currencyType: CurrencyType) {
        super(lines.reduce((content, line) => content + '\n' + line, ''));
        this._currencyType = currencyType;
    }

    get currencyType(): CurrencyType {
        return this._currencyType;
    }

    public override setCurrencyType(currencyType: CurrencyType): this {
        this._currencyType = currencyType;
        return this;
    }

    public override setCurrencyTypeById(currencyTypeId: Guid, guild: Guild): this {
        this._currencyType = guild.currencyTypes.find(type => type.id.equals(currencyTypeId))!;
        return this;
    }

    public addGuildUserLedgerEntryLine(receiverId: Snowflake, entry: LedgerEntry, roleName: string | undefined = undefined): this {
        switch (entry.type) {
            case LedgerEntryType.Bonus:
                return this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was added to <@${receiverId.value}>'s balance.`);
            case LedgerEntryType.Deduction:
                return this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was deducted from <@${receiverId.value}>'s balance.`);
            case LedgerEntryType.RoleClaim:
                const role: string = roleName ? roleName : `<@&${(entry as RoleClaimEntry).roleId.value}>`;
                return this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was claimed for ${role}.`);
            default:
                throw new Error('Cannot determine action for unsupported ledger entry type.');
        }
    }

    public addCharacterLedgerEntryLine(characterName: string, entry: LedgerEntry): this {
        switch (entry.type) {
            case LedgerEntryType.Bonus:
                return this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was added to ${characterName}'s balance.`);
            case LedgerEntryType.Deduction:
                return this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was deducted from ${characterName}'s balance.`);
            case LedgerEntryType.Expenditure:
                this.addLine(`${entry.currency.quantity} ${this._currencyType.name} was spent from ${characterName}'s balance.`)
            default:
                throw new Error('Cannot determine action for unsupported ledger entry type.');
        }
    }

    public addBalanceChangeLine(previousQuantity: number, currentQuantity: number): this {
        return this.addLine(`${previousQuantity} -> ${currentQuantity} ${this._currencyType.name}`);
    }

    public addBalanceLine(entity: GuildUser | Character, name: string | undefined = undefined): this {
        let cleanedName: string = !!name ? `${name.trim()}'s ` : '';
        return this.addLine(`${cleanedName}${this._currencyType.name}: ${entity.ledger.getBalance(this._currencyType.id)}`);
    }
}