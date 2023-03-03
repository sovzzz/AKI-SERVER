import { inject, injectable } from "tsyringe";

import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IItemConfig } from "../models/spt/config/IItemConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";

/** Centralise the handling of blacklisting items, uses blacklist found in config/item.json, stores items that should not be used by players / broken items */ 
@injectable()
export class ItemFilterService
{
    protected blacklist: string[] = [];
    protected itemConfig: IItemConfig ;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.itemConfig = this.configServer.getConfig(ConfigTypes.ITEM);
        this.blacklist = this.itemConfig.blacklist;
    }

    /**
     * Check if the provided template id is blacklisted in config/item.json
     * @param tpl template id
     * @returns true if blacklisted
     */
    public isItemBlacklisted(tpl: string): boolean
    {
        return this.blacklist.includes(tpl);
    }

    /**
     * Return every template id blacklisted in config/item.json
     * @returns string array of blacklisted tempalte ids
     */
    public getBlacklistedItems(): string[]
    {
        return this.blacklist;
    }
}