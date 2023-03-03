import { inject, injectable } from "tsyringe";

import { SellResult } from "../models/eft/ragfair/IRagfairOffer";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IRagfairConfig } from "../models/spt/config/IRagfairConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { RandomUtil } from "../utils/RandomUtil";
import { TimeUtil } from "../utils/TimeUtil";

@injectable()
export class RagfairSellHelper
{
    protected ragfairConfig: IRagfairConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
    }

    /**
     * Get the percent chance to sell an item based on its average listed price vs player chosen listing price
     * @param baseChancePercent Base chance to sell item
     * @param averageOfferPriceRub Price of average offer in roubles
     * @param playerListedPriceRub Price player listed item for in roubles
     * @returns percent value
     */
    public calculateSellChance(baseChancePercent: number, averageOfferPriceRub: number, playerListedPriceRub: number): number
    {
        // Get sell chance multiplier
        const multiplier = (playerListedPriceRub > averageOfferPriceRub)
            ? this.ragfairConfig.sell.chance.overpriced // Player price is over average listing price
            : this.getSellMultiplierWhenPlayerPriceIsBelowAverageListingPrice(averageOfferPriceRub, playerListedPriceRub);

        return Math.round(baseChancePercent * (averageOfferPriceRub / playerListedPriceRub * multiplier));
    }

    /**
     * Get percent chance to sell an item when price is below items average listing price
     * @param playerListedPriceRub Price player listed item for in roubles
     * @param averageOfferPriceRub Price of average offer in roubles
     * @returns percent value
     */
    protected getSellMultiplierWhenPlayerPriceIsBelowAverageListingPrice(averageOfferPriceRub: number, playerListedPriceRub: number): number
    {
        return (playerListedPriceRub < averageOfferPriceRub)
            ? this.ragfairConfig.sell.chance.underpriced
            : 1;
    }

    /**
     * Determine if the offer being listed will be sold
     * @param sellChancePercent chance item will sell
     * @param itemSellCount count of items to sell
     * @returns Array of purchases of item(s) listed
     */
    public rollForSale(sellChancePercent: number, itemSellCount: number): SellResult[]
    {
        const startTime = this.timeUtil.getTimestamp();

        // Get a time in future to stop simulating sell chances at
        const endTime = startTime + this.timeUtil.getHoursAsSeconds(this.ragfairConfig.sell.simulatedSellHours);

        // TODO - what is going on here
        const chance = 100 - Math.min(Math.max(sellChancePercent, 0), 100);

        let sellTime = startTime;
        let remainingCount = itemSellCount;
        const result: SellResult[] = [];
        
        // Value can sometimes be NaN for whatever reason, default to base chance if that happens
        if (isNaN(sellChancePercent))
        {
            sellChancePercent = this.ragfairConfig.sell.chance.base;
        }
        
        this.logger.debug(`Rolling for sell ${itemSellCount} items (chance: ${sellChancePercent})`);

        // No point rolling for a sale on a 0% chance item, exit early
        if (sellChancePercent === 0)
        {
            return result;
        }
        
        while (remainingCount > 0 && sellTime < endTime)
        {
            sellTime += Math.max(Math.round(chance / 100 * this.ragfairConfig.sell.time.max * 60), this.ragfairConfig.sell.time.min * 60);

            if (this.randomUtil.getChance100(sellChancePercent))
            {
                const boughtAmount = this.randomUtil.getInt(1, remainingCount);

                result.push({
                    sellTime: sellTime,
                    amount: boughtAmount
                });

                this.logger.debug(`offer will sell at ${new Date(sellTime*1000).toLocaleTimeString("en-US")}`);

                remainingCount -= boughtAmount;
            }
        }

        return result;
    }
}