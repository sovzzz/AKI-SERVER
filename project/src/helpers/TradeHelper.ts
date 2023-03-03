import { inject, injectable } from "tsyringe";

import { InventoryHelper } from "../helpers/InventoryHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { Item, Upd } from "../models/eft/common/tables/IItem";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBuyTradeRequestData } from "../models/eft/trade/IProcessBuyTradeRequestData";
import { IProcessSellTradeRequestData } from "../models/eft/trade/IProcessSellTradeRequestData";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { Traders } from "../models/enums/Traders";
import { ITraderConfig } from "../models/spt/config/ITraderConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { ConfigServer } from "../servers/ConfigServer";
import { RagfairServer } from "../servers/RagfairServer";
import { FenceService } from "../services/FenceService";
import { PaymentService } from "../services/PaymentService";

@injectable()
export class TradeHelper
{
    protected traderConfig: ITraderConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PaymentService") protected paymentService: PaymentService,
        @inject("FenceService") protected fenceService: FenceService,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("RagfairServer") protected ragfairServer: RagfairServer,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.traderConfig = this.configServer.getConfig(ConfigTypes.TRADER);
    }

    /**
     * Buy item from flea or trader
     * @param pmcData Player profile
     * @param buyRequestData data from client
     * @param sessionID Session id
     * @param foundInRaid Should item be found in raid
     * @param upd optional item details used when buying from flea
     * @returns 
     */
    public buyItem(pmcData: IPmcData, buyRequestData: IProcessBuyTradeRequestData, sessionID: string, foundInRaid: boolean, upd: Upd): IItemEventRouterResponse
    {
        let output = this.eventOutputHolder.getOutput(sessionID);

        const newReq = {
            items: [
                {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    item_id: buyRequestData.item_id,
                    count: buyRequestData.count
                }
            ],
            tid: buyRequestData.tid
        };

        const callback = () =>
        {
            let itemPurchased: Item;
            const isRagfair = buyRequestData.tid.toLocaleLowerCase() === "ragfair";
            if (isRagfair)
            {
                const allOffers = this.ragfairServer.getOffers();
                const offersWithItem = allOffers.find(x => x.items[0]._id === buyRequestData.item_id);
                itemPurchased = offersWithItem.items[0];
            }
            else
            {
                const traderAssorts = this.traderHelper.getTraderAssortsById(buyRequestData.tid).items;
                itemPurchased = traderAssorts.find(x => x._id === buyRequestData.item_id);
            }

            // Ensure purchase does not exceed trader item limit
            const hasBuyRestrictions = this.itemHelper.hasBuyRestrictions(itemPurchased);
            if (hasBuyRestrictions)
            {
                this.checkPurchaseIsWithinTraderItemLimit(itemPurchased, buyRequestData.item_id, buyRequestData.count);
            }

            // Decrement trader item count
            if (!isRagfair)
            {
                itemPurchased.upd.StackObjectsCount -= buyRequestData.count;
            }

            if (this.traderConfig.persistPurchaseDataInProfile && hasBuyRestrictions)
            {
                this.traderHelper.addTraderPurchasesToPlayerProfile(sessionID, newReq);
            }

            /// Pay for item
            output = this.paymentService.payMoney(pmcData, buyRequestData, sessionID, output);
            if (output.warnings.length > 0)
            {
                throw new Error(`Transaction failed: ${output.warnings[0].errmsg}`);
            }

            if (buyRequestData.tid === Traders.FENCE)
            {
                // Bought fence offer, remove from listing
                this.fenceService.removeFenceOffer(buyRequestData.item_id);
            }
            else
            {
                if (hasBuyRestrictions)
                {
                    // Increment non-fence trader item buy count
                    this.incrementAssortBuyCount(itemPurchased, buyRequestData.count);
                }
            }

            this.logger.debug(`Bought item: ${buyRequestData.item_id} from ${buyRequestData.tid}`);
        };

        return this.inventoryHelper.addItem(pmcData, newReq, output, sessionID, callback, foundInRaid, upd);
    }

    /**
     * Sell item to trader
     * @param pmcData Profile to update
     * @param sellRequest request data
     * @param sessionID Session id
     * @returns IItemEventRouterResponse
     */
    public sellItem(pmcData: IPmcData, sellRequest: IProcessSellTradeRequestData, sessionID: string): IItemEventRouterResponse
    {
        let output = this.eventOutputHolder.getOutput(sessionID);

        for (const sellItem of sellRequest.items)
        {
            for (const item of pmcData.Inventory.items)
            {
                // Profile inventory, look into it if item exist
                const isThereSpace = sellItem.id.search(" ");
                let checkID = sellItem.id;

                if (isThereSpace !== -1)
                {
                    checkID = checkID.substr(0, isThereSpace);
                }

                // item found
                if (item._id === checkID)
                {
                    this.logger.debug(`Selling: ${checkID}`);

                    // Remove item from inventory
                    output = this.inventoryHelper.removeItem(pmcData, checkID, sessionID, output);

                    break;
                }
            }
        }

        // Give player money now item is sold to trader
        return this.paymentService.getMoney(pmcData, sellRequest.price, sellRequest, output, sessionID);
    }

    /**
     * Increment the assorts buy count by number of items purchased
     * Show error on screen if player attempts to buy more than what the buy max allows
     * @param assortBeingPurchased assort being bought
     * @param itemsPurchasedCount number of items being bought
     */
    protected incrementAssortBuyCount(assortBeingPurchased: Item, itemsPurchasedCount: number): void
    {
        assortBeingPurchased.upd.BuyRestrictionCurrent += itemsPurchasedCount;

        if (assortBeingPurchased.upd.BuyRestrictionCurrent > assortBeingPurchased.upd.BuyRestrictionMax)
        {
            throw "Unable to purchase item, Purchase limit reached";
        }
    }

    protected checkPurchaseIsWithinTraderItemLimit(assortBeingPurchased: Item, assortId: string, count: number): void
    {
        if ((assortBeingPurchased.upd.BuyRestrictionCurrent + count) > assortBeingPurchased.upd?.BuyRestrictionMax)
        {
            throw `Unable to purchase ${count} items, this would exceed your purchase limit of ${assortBeingPurchased.upd.BuyRestrictionMax} from the trader this refresh`;
        }
    }
}