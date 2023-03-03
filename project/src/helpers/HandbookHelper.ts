import { inject, injectable } from "tsyringe";

import { Money } from "../models/enums/Money";
import { DatabaseServer } from "../servers/DatabaseServer";

class LookupItem
{
    byId: Record<number, string>;
    byParent: Record<string, string[]>;

    constructor()
    {
        this.byId = {};
        this.byParent = {};
    }
}

export class LookupCollection
{
    items: LookupItem;
    categories: LookupItem;

    constructor()
    {
        this.items = new LookupItem();
        this.categories = new LookupItem();
    }
}

@injectable()
export class HandbookHelper
{    
    protected lookupCacheGenerated = false;
    protected handbookPriceCache = new LookupCollection();

    constructor(@inject("DatabaseServer") protected databaseServer: DatabaseServer)
    {}

    public hydrateLookup(): void
    {
        for (const handbookItem of this.databaseServer.getTables().templates.handbook.Items)
        {
            this.handbookPriceCache.items.byId[handbookItem.Id] = handbookItem.Price;
            if (!this.handbookPriceCache.items.byParent[handbookItem.ParentId])
            {
                this.handbookPriceCache.items.byParent[handbookItem.ParentId] = [];
            }
            this.handbookPriceCache.items.byParent[handbookItem.ParentId].push(handbookItem.Id);
        }

        for (const handbookCategory of this.databaseServer.getTables().templates.handbook.Categories)
        {
            this.handbookPriceCache.categories.byId[handbookCategory.Id] = handbookCategory.ParentId ? handbookCategory.ParentId : null;

            if (handbookCategory.ParentId)
            {
                if (!this.handbookPriceCache.categories.byParent[handbookCategory.ParentId])
                {
                    this.handbookPriceCache.categories.byParent[handbookCategory.ParentId] = [];
                }
                this.handbookPriceCache.categories.byParent[handbookCategory.ParentId].push(handbookCategory.Id);
            }
        }
    }

    /**
     * Get price from internal cache, if cache empty look up price directly in handbook (expensive)
     * If no values found, return 1
     * @param tpl item tpl to look up price for
     * @returns price in roubles
     */
    public getTemplatePrice(tpl: string): number
    {
        if (!this.lookupCacheGenerated)
        {
            this.hydrateLookup();
            this.lookupCacheGenerated = true;
        }

        if (tpl in this.handbookPriceCache.items.byId)
        {
            return this.handbookPriceCache.items.byId[tpl];
        }

        const handbookItem = this.databaseServer.getTables().templates.handbook.Items.find(x => x.Id === tpl);

        return handbookItem
            ? handbookItem.Price
            : 1;
    }

    /**
     * all items in template with the given parent category
     * @param x 
     * @returns string array
     */
    public templatesWithParent(x: string): string[]
    {
        return (x in this.handbookPriceCache.items.byParent) ? this.handbookPriceCache.items.byParent[x] : [];
    }

    /**
     * Does category exist in handbook cache
     * @param category 
     * @returns true if exists in cache
     */
    public isCategory(category: string): boolean
    {
        return (category in this.handbookPriceCache.categories.byId);
    }

    public childrenCategories(x: string): string[]
    {
        return (x in this.handbookPriceCache.categories.byParent) ? this.handbookPriceCache.categories.byParent[x] : [];
    }

    /**
     * Convert non-roubles into roubles
     * @param nonRoubleCurrencyCount Currency count to convert
     * @param currencyTypeFrom What current currency is
     * @returns Count in roubles
     */
    public inRUB(nonRoubleCurrencyCount: number, currencyTypeFrom: string): number
    {
        if (currencyTypeFrom === Money.ROUBLES)
        {
            return nonRoubleCurrencyCount;
        }

        return Math.round(nonRoubleCurrencyCount * (this.getTemplatePrice(currencyTypeFrom) || 0));
    }

    /**
     * Convert roubles into another currency
     * @param roubleCurrencyCount roubles to convert
     * @param currencyTypeTo Currency to convert roubles into
     * @returns currency count in desired type
     */
    public fromRUB(roubleCurrencyCount: number, currencyTypeTo: string): number
    {
        if (currencyTypeTo === Money.ROUBLES)
        {
            return roubleCurrencyCount;
        }

        // Get price of currency from handbook
        const price = this.getTemplatePrice(currencyTypeTo);
        return price ? Math.round(roubleCurrencyCount / price) : 0;
    }
}