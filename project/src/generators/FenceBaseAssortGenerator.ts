import { inject, injectable } from "tsyringe";
import { Money } from "../models/enums/Money";

import { HandbookHelper } from "../helpers/HandbookHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { Item } from "../models/eft/common/tables/IItem";
import { ITemplateItem } from "../models/eft/common/tables/ITemplateItem";
import { IBarterScheme } from "../models/eft/common/tables/ITrader";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { Traders } from "../models/enums/Traders";
import { ITraderConfig } from "../models/spt/config/ITraderConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { ItemFilterService } from "../services/ItemFilterService";

@injectable()
export class FenceBaseAssortGenerator
{
    protected traderConfig: ITraderConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("HandbookHelper") protected handbookHelper: HandbookHelper,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("ItemFilterService") protected itemFilterService: ItemFilterService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.traderConfig = this.configServer.getConfig(ConfigTypes.TRADER);
    }

    /**
     * Create base fence assorts dynamically and store in db
     */
    public generateFenceBaseAssorts(): void
    {
        const baseFenceAssort = this.databaseServer.getTables().traders[Traders.FENCE].assort;

        const dbItems = Object.values(this.databaseServer.getTables().templates.items);
        for (const item of dbItems.filter(x => this.isValidFenceItem(x)))
        {
            // Skip blacklisted items
            if (this.itemFilterService.isItemBlacklisted(item._id))
            {
                continue;
            }

            if (!this.itemHelper.isValidItem(item._id))
            {
                continue;
            }

            // Skip quest items
            if (item._props.QuestItem)
            {
                continue;
            }

            // Skip items on fence ignore list
            if (this.traderConfig.fence.blacklist.length > 0)
            {
                if (this.traderConfig.fence.blacklist.includes(item._id) 
                    || this.itemHelper.isOfBaseclasses(item._id, this.traderConfig.fence.blacklist))
                {
                    continue;
                }
            }

            // Create barter scheme object
            const barterSchemeToAdd: IBarterScheme = {
                count: Math.round(this.handbookHelper.getTemplatePrice(item._id) * this.traderConfig.fence.itemPriceMult),
                _tpl: Money.ROUBLES
            };

            // Add barter data to base
            baseFenceAssort.barter_scheme[item._id] = [[barterSchemeToAdd]];

            // Create item object
            const itemToAdd: Item = {
                _id: item._id,
                _tpl: item._id,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    StackObjectsCount: 9999999,
                    UnlimitedCount: true
                }
            };

            // Add item to base
            baseFenceAssort.items.push(itemToAdd);

            // Add loyalty data to base
            baseFenceAssort.loyal_level_items[item._id] = 1;
        }
    }

    /**
     * Check if item is valid for being added to fence assorts
     * @param item Item to check
     * @returns true if valid fence item
     */
    protected isValidFenceItem(item: ITemplateItem): boolean
    {
        if (item._type === "Item")
        {
            return true;
        }

        return false;
    }
}