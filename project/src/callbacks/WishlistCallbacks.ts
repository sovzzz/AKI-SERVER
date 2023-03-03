import { inject, injectable } from "tsyringe";

import { WishlistController } from "../controllers/WishlistController";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IWishlistActionData } from "../models/eft/wishlist/IWishlistActionData";

@injectable()
export class WishlistCallbacks
{
    constructor(
        @inject("WishlistController") protected wishlistController: WishlistController)
    { }

    public addToWishlist(pmcData: IPmcData, body: IWishlistActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.wishlistController.addToWishList(pmcData, body, sessionID);
    }

    public removeFromWishlist(pmcData: IPmcData, body: IWishlistActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.wishlistController.removeFromWishList(pmcData, body, sessionID);
    }
}