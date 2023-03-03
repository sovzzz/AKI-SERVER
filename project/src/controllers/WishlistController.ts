import { inject, injectable } from "tsyringe";
import { EventOutputHolder } from "../routers/EventOutputHolder";

import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IWishlistActionData } from "../models/eft/wishlist/IWishlistActionData";

@injectable()
export class WishlistController
{
    constructor(
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder
    )
    { }

    /* Adding item to wishlist
    *  input: playerProfileData, Request body
    *  output: OK (saved profile)
    * */
    public addToWishList(pmcData: IPmcData, body: IWishlistActionData, sessionID: string): IItemEventRouterResponse
    {
        for (const item in pmcData.WishList)
        {
            // don't add the item
            if (pmcData.WishList[item] === body.templateId)
            {
                return this.eventOutputHolder.getOutput(sessionID);
            }
        }

        // add the item to the wishlist
        pmcData.WishList.push(body.templateId);
        return this.eventOutputHolder.getOutput(sessionID);
    }

    /* Removing item to wishlist
    *  input: playerProfileData, Request body
    *  output: OK (saved profile)
    * */
    public removeFromWishList(pmcData: IPmcData, body: IWishlistActionData, sessionID: string): IItemEventRouterResponse
    {
        for (let i = 0; i < pmcData.WishList.length; i++)
        {
            if (pmcData.WishList[i] === body.templateId)
            {
                pmcData.WishList.splice(i, 1);
            }
        }

        return this.eventOutputHolder.getOutput(sessionID);
    }
}