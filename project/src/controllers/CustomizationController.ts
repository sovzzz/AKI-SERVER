import { inject, injectable } from "tsyringe";

import { ProfileHelper } from "../helpers/ProfileHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { ISuit } from "../models/eft/common/tables/ITrader";
import {
    ClothingItem, IBuyClothingRequestData
} from "../models/eft/customization/IBuyClothingRequestData";
import { IWearClothingRequestData } from "../models/eft/customization/IWearClothingRequestData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { DatabaseServer } from "../servers/DatabaseServer";
import { SaveServer } from "../servers/SaveServer";
import { LocalisationService } from "../services/LocalisationService";

@injectable()
export class CustomizationController
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper
    )
    {}

    public getTraderSuits(traderID: string, sessionID: string): ISuit[]
    {
        const pmcData: IPmcData = this.profileHelper.getPmcProfile(sessionID);
        const templates = this.databaseServer.getTables().templates.customization;
        const suits = this.databaseServer.getTables().traders[traderID].suits;
        const result: ISuit[] = [];

        // get only suites from the player's side (e.g. USEC)
        for (const suit of suits)
        {
            if (suit.suiteId in templates)
            {
                for (let i = 0; i < templates[suit.suiteId]._props.Side.length; i++)
                {
                    if (templates[suit.suiteId]._props.Side[i] === pmcData.Info.Side)
                    {
                        result.push(suit);
                    }
                }
            }
        }

        return result;
    }

    public wearClothing(pmcData: IPmcData, wearClothingRequest: IWearClothingRequestData, sessionID: string): IItemEventRouterResponse
    {
        for (const suitId of wearClothingRequest.suites)
        {
            const dbSuit = this.databaseServer.getTables().templates.customization[suitId];

            // Lower Node
            if (dbSuit._parent === "5cd944d01388ce000a659df9")
            {
                pmcData.Customization.Feet = dbSuit._props.Feet;
            }

            // Upper Node
            if (dbSuit._parent === "5cd944ca1388ce03a44dc2a4")
            {
                pmcData.Customization.Body = dbSuit._props.Body;
                pmcData.Customization.Hands = dbSuit._props.Hands;
            }
        }

        return this.eventOutputHolder.getOutput(sessionID);
    }

    public buyClothing(pmcData: IPmcData, buyClothingRequest: IBuyClothingRequestData, sessionId: string): IItemEventRouterResponse
    {
        const db = this.databaseServer.getTables();
        const output = this.eventOutputHolder.getOutput(sessionId);

        const traderOffer = this.getTraderClothingOffer(sessionId, buyClothingRequest.offer);
        if (!traderOffer)
        {
            this.logger.error(`Unable to find trader suit offer with id: ${buyClothingRequest.offer}`);

            return output;
        }

        const suitId = traderOffer.suiteId;
        if (this.outfitAlreadyPurchased(sessionId, suitId))
        {
            const suitDetails = db.templates.customization[suitId];
            this.logger.error(this.localisationService.getText("customisation-item_already_purchased", {itemId: suitDetails._id, itemName: suitDetails._name}));

            return output;
        }

        // Pay for items
        this.payForClothingItems(sessionId, pmcData, buyClothingRequest.items, output);

        // Add clothing to profile
        this.saveServer.getProfile(sessionId).suits.push(suitId);

        return output;
    }

    protected getTraderClothingOffer(sessionId: string, offerId: string): ISuit
    {
        return this.getAllTraderSuits(sessionId).find(x => x._id === offerId);
    }

    /**
     * Has an outfit been purchased by a player
     * @param suitId clothing id
     * @param sessionID Session id
     * @returns true/false
     */
    protected outfitAlreadyPurchased(suitId: string, sessionID: string): boolean
    {
        return this.saveServer.getProfile(sessionID).suits.includes(suitId);
    }

    /**
     * Update output object and player profile with purchase details
     * @param sessionId Session id
     * @param pmcData Player profile
     * @param clothingItems Clothing purchased
     * @param output Client response
     */
    protected payForClothingItems(sessionId: string, pmcData: IPmcData, clothingItems: ClothingItem[], output: IItemEventRouterResponse): void
    {
        for (const sellItem of clothingItems)
        {
            this.payForClothingItem(sessionId, pmcData, sellItem, output);
        }
    }

    /**
     * Update output object and player profile with purchase details for single piece of clothing
     * @param sessionId Session id
     * @param pmcData Player profile
     * @param clothingItem Clothing item purchased
     * @param output Client response
     * @returns 
     */
    protected payForClothingItem(sessionId: string, pmcData: IPmcData, clothingItem: ClothingItem, output: IItemEventRouterResponse): void
    {
        const relatedItem = pmcData.Inventory.items.find(x => x._id === clothingItem.id);
        if (!relatedItem)
        {
            this.logger.error(`Clothing item not found in inventory with id: ${clothingItem.id}`);

            return;
        }

        if (clothingItem.del === true)
        {
            output.profileChanges[sessionId].items.del.push(relatedItem);
            pmcData.Inventory.items.splice(pmcData.Inventory.items.indexOf(relatedItem), 1);
        }

        if (relatedItem.upd.StackObjectsCount > clothingItem.count)
        {
            pmcData.Inventory.items[relatedItem._id].upd.StackObjectsCount -= clothingItem.count;
            output.profileChanges[sessionId].items.change.push({
                _id: relatedItem._id,
                _tpl: relatedItem._tpl,
                parentId: relatedItem.parentId,
                slotId: relatedItem.slotId,
                location: relatedItem.location,
                upd: { StackObjectsCount: relatedItem.upd.StackObjectsCount }
            });
        }
    }

    protected getAllTraderSuits(sessionID: string): ISuit[]
    {
        const traders = this.databaseServer.getTables().traders;
        let result: ISuit[] = [];

        for (const traderID in traders)
        {
            if (traders[traderID].base.customization_seller === true)
            {
                result = [...result, ...this.getTraderSuits(traderID, sessionID)];
            }
        }

        return result;
    }
}