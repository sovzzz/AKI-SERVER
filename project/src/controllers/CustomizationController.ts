import { inject, injectable } from "tsyringe";

import { ProfileHelper } from "../helpers/ProfileHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { ISuit } from "../models/eft/common/tables/ITrader";
import { IBuyClothingRequestData } from "../models/eft/customization/IBuyClothingRequestData";
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

    public wearClothing(pmcData: IPmcData, body: IWearClothingRequestData, sessionID: string): IItemEventRouterResponse
    {
        for (let i = 0; i < body.suites.length; i++)
        {
            const suite = this.databaseServer.getTables().templates.customization[body.suites[i]];

            // this parent refers to Lower Node
            if (suite._parent === "5cd944d01388ce000a659df9")
            {
                pmcData.Customization.Feet = suite._props.Feet;
            }

            // this parent reffers to Upper Node
            if (suite._parent === "5cd944ca1388ce03a44dc2a4")
            {
                pmcData.Customization.Body = suite._props.Body;
                pmcData.Customization.Hands = suite._props.Hands;
            }
        }

        return this.eventOutputHolder.getOutput(sessionID);
    }

    public buyClothing(pmcData: IPmcData, body: IBuyClothingRequestData, sessionID: string): IItemEventRouterResponse
    {
        const db = this.databaseServer.getTables();
        const output = this.eventOutputHolder.getOutput(sessionID);

        // find suit offer
        const offers = this.getAllTraderSuits(sessionID);
        const traderOffer = offers.find(x => x._id === body.offer);
        const suitId = traderOffer.suiteId;

        // check if outfit already exists
        if (this.saveServer.getProfile(sessionID).suits.includes(suitId))
        {
            const suitDetails = db.templates.customization[suitId];
            this.logger.error(this.localisationService.getText("customisation-item_already_purchased", {itemId: suitDetails._id, itemName: suitDetails._name}));

            return output;
        }

        // pay items
        for (const sellItem of body.items)
        {
            for (const itemID in pmcData.Inventory.items)
            {
                const item = pmcData.Inventory.items[itemID];

                if (item._id !== sellItem.id)
                {
                    continue;
                }

                if (sellItem.del === true)
                {
                    output.profileChanges[sessionID].items.del.push(item);
                    pmcData.Inventory.items.splice(Number(itemID), 1);
                }

                if (item.upd.StackObjectsCount > sellItem.count)
                {
                    pmcData.Inventory.items[itemID].upd.StackObjectsCount -= sellItem.count;
                    output.profileChanges[sessionID].items.change.push({
                        _id: item._id,
                        _tpl: item._tpl,
                        parentId: item.parentId,
                        slotId: item.slotId,
                        location: item.location,
                        upd: { StackObjectsCount: item.upd.StackObjectsCount }
                    });
                }
            }
        }

        // add clothing to profile
        this.saveServer.getProfile(sessionID).suits.push(suitId);

        return output;
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