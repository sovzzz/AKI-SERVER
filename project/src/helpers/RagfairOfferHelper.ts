import { inject, injectable } from "tsyringe";

import { IPmcData } from "../models/eft/common/IPmcData";
import { Item } from "../models/eft/common/tables/IItem";
import { ITraderAssort } from "../models/eft/common/tables/ITrader";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ISystemData } from "../models/eft/profile/IAkiProfile";
import { IRagfairOffer } from "../models/eft/ragfair/IRagfairOffer";
import { ISearchRequestData, OfferOwnerType } from "../models/eft/ragfair/ISearchRequestData";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { MemberCategory } from "../models/enums/MemberCategory";
import { MessageType } from "../models/enums/MessageType";
import { RagfairSort } from "../models/enums/RagfairSort";
import { Traders } from "../models/enums/Traders";
import { IQuestConfig } from "../models/spt/config/IQuestConfig";
import { IRagfairConfig } from "../models/spt/config/IRagfairConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { SaveServer } from "../servers/SaveServer";
import { LocaleService } from "../services/LocaleService";
import { RagfairOfferService } from "../services/RagfairOfferService";
import { HashUtil } from "../utils/HashUtil";
import { TimeUtil } from "../utils/TimeUtil";
import { DialogueHelper } from "./DialogueHelper";
import { ItemHelper } from "./ItemHelper";
import { PaymentHelper } from "./PaymentHelper";
import { PresetHelper } from "./PresetHelper";
import { ProfileHelper } from "./ProfileHelper";
import { RagfairHelper } from "./RagfairHelper";
import { RagfairServerHelper } from "./RagfairServerHelper";
import { RagfairSortHelper } from "./RagfairSortHelper";
import { TraderHelper } from "./TraderHelper";

@injectable()
export class RagfairOfferHelper
{
    protected static goodSoldTemplate = "5bdac0b686f7743e1665e09e";
    protected ragfairConfig: IRagfairConfig;
    protected questConfig: IQuestConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("DialogueHelper") protected dialogueHelper: DialogueHelper,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PaymentHelper") protected paymentHelper: PaymentHelper,
        @inject("PresetHelper") protected presetHelper: PresetHelper,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("RagfairServerHelper") protected ragfairServerHelper: RagfairServerHelper,
        @inject("RagfairSortHelper") protected ragfairSortHelper: RagfairSortHelper,
        @inject("RagfairHelper") protected ragfairHelper: RagfairHelper,
        @inject("RagfairOfferService") protected ragfairOfferService: RagfairOfferService,
        @inject("LocaleService") protected localeService: LocaleService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
        this.questConfig = this.configServer.getConfig(ConfigTypes.QUEST);
    }

    public getValidOffers(searchRequest: ISearchRequestData, itemsToAdd: string[], traderAssorts: Record<string, ITraderAssort>, pmcProfile: IPmcData): IRagfairOffer[]
    {
        return this.ragfairOfferService.getOffers().filter(x => this.isDisplayableOffer(searchRequest, itemsToAdd, traderAssorts, x, pmcProfile));
    }

    /**
     * Get offers from flea/traders specifically when building weapon preset
     * @param searchRequest Search request data
     * @param itemsToAdd string array of item tpls to search for
     * @param traderAssorts All trader assorts player can access/buy
     * @param pmcProfile Player profile
     * @returns ITraderAssort
     */
    public getOffersForBuild(searchRequest: ISearchRequestData, itemsToAdd: string[], traderAssorts: Record<string, ITraderAssort>, pmcProfile: IPmcData): IRagfairOffer[]
    {
        const offersMap = new Map<string, IRagfairOffer[]>();
        const offers: IRagfairOffer[] = [];
        for (const offer of this.ragfairOfferService.getOffers())
        {
            if (this.isDisplayableOffer(searchRequest, itemsToAdd, traderAssorts, offer, pmcProfile))
            {
                const isTraderOffer = offer.user.memberType === MemberCategory.TRADER;

                if (isTraderOffer && this.traderBuyRestrictionReached(offer))
                {
                    continue;
                }

                if (isTraderOffer && this.traderOutOfStock(offer))
                {
                    continue;
                }

                if (isTraderOffer && this.traderOfferItemQuestLocked(offer, traderAssorts))
                {
                    continue;
                }

                const key = offer.items[0]._tpl;
                if (!offersMap.has(key))
                {
                    offersMap.set(key, []);
                }

                offersMap.get(key).push(offer);
            }
        }

        // get best offer for each item to show on screen
        for (let possibleOffers of offersMap.values())
        {
            // Remove offers with locked = true (quest locked) when > 1 possible offers
            // single trader item = shows greyed out
            // multiple offers for item = is greyed out
            if (possibleOffers.length > 1)
            {
                const lockedOffers = this.getLoyaltyLockedOffers(possibleOffers, pmcProfile);
                
                // Exclude locked offers + above loyalty locked offers if at least 1 was found
                const availableOffers = possibleOffers.filter(x => !(x.locked || lockedOffers.includes(x._id)));
                if (availableOffers.length > 0)
                {
                    possibleOffers = availableOffers;
                }                
            }

            const offer = this.ragfairSortHelper.sortOffers(possibleOffers, RagfairSort.PRICE, 0)[0];
            offers.push(offer);
        }

        return offers;
    }

    /**
     * Check if offer item is quest locked for current player by looking at sptQuestLocked property in traders barter_scheme
     * @param offer Offer to check is quest locked
     * @param traderAssorts all trader assorts for player
     * @returns true if quest locked
     */
    public traderOfferItemQuestLocked(offer: IRagfairOffer, traderAssorts: Record<string, ITraderAssort>): boolean
    {
        return offer.items?.some(i => traderAssorts[offer.user.id].barter_scheme[i._id]?.some(bs1 => bs1?.some(bs2 => bs2.sptQuestLocked)));
    }

    /**
     * Has a traders offer ran out of stock to sell to player
     * @param offer Offer to check stock of
     * @returns true if out of stock
     */
    protected traderOutOfStock(offer: IRagfairOffer): boolean 
    {
        if (offer?.items?.length === 0)
        {
            return true;
        }

        return offer.items[0]?.upd?.StackObjectsCount === 0;
    }

    /**
     * Check if trader offers' BuyRestrictionMax value has been reached
     * @param offer offer to check restriction properties of
     * @returns true if restriction reached, false if no restrictions/not reached
     */
    protected traderBuyRestrictionReached(offer: IRagfairOffer): boolean
    {
        const traderAssorts = this.traderHelper.getTraderAssortsById(offer.user.id).items;
        const assortData = traderAssorts.find(x => x._id === offer._id);

        // No trader assort data
        if (!assortData)
        {
            this.logger.warning(`Unable to find trader ${offer.user.nickname} assort for item ${this.itemHelper.getItemName(offer.items[0]._tpl)} ${offer.items[0]._tpl}`);
            return false;
        }

        // No restriction values
        // Can't use !assortData.upd.BuyRestrictionX as value could be 0 
        if (assortData.upd.BuyRestrictionMax === undefined || assortData.upd.BuyRestrictionCurrent === undefined)
        {
            return false;
        }

        // Current equals max, limit reached
        if (assortData?.upd.BuyRestrictionCurrent === assortData.upd.BuyRestrictionMax)
        {
            return true;
        }

        return false;
    }

    /**
     * Get an array of flea offers that are inaccessible to player due to their inadequate loyalty level
     * @param offers Offers to check
     * @param pmcProfile Players profile with trader loyalty levels
     */
    protected getLoyaltyLockedOffers(offers: IRagfairOffer[], pmcProfile: IPmcData): string[]
    {
        const loyaltyLockedOffers: string[] = [];
        for (const offer of offers)
        {
            if (offer.user.memberType === MemberCategory.TRADER)
            {
                const traderDetails = pmcProfile.TradersInfo[offer.user.id];
                if (traderDetails.loyaltyLevel < offer.loyaltyLevel)
                {
                    loyaltyLockedOffers.push(offer._id);
                }
            }
        }

        return loyaltyLockedOffers;
    }

    public processOffersOnProfile(sessionID: string): boolean
    {
        const timestamp = this.timeUtil.getTimestamp();

        const profileOffers = this.getProfileOffers(sessionID);

        if (!profileOffers?.length)
        {
            return true;
        }

        for (const offer of profileOffers.values())
        {
            if (offer.sellResult && offer.sellResult.length > 0 && timestamp >= offer.sellResult[0].sellTime)
            {
                // Item sold
                let totalItemsCount = 1;
                let boughtAmount = 1;

                if (!offer.sellInOnePiece)
                {
                    totalItemsCount = offer.items.reduce((sum: number, item) => sum += item.upd.StackObjectsCount, 0);
                    boughtAmount = offer.sellResult[0].amount;
                }

                // Increase rating
                const profileRagfairInfo = this.saveServer.getProfile(sessionID).characters.pmc.RagfairInfo;
                profileRagfairInfo.rating += this.ragfairConfig.sell.reputation.gain * offer.summaryCost / totalItemsCount * boughtAmount;
                profileRagfairInfo.isRatingGrowing = true;

                this.completeOffer(sessionID, offer, boughtAmount);
                offer.sellResult.splice(0, 1);
            }
        }

        return true;
    }

    protected getProfileOffers(sessionID: string): IRagfairOffer[]
    {
        const profile = this.profileHelper.getPmcProfile(sessionID);

        if (profile.RagfairInfo === undefined || profile.RagfairInfo.offers === undefined)
        {
            return [];
        }

        return profile.RagfairInfo.offers;
    }

    protected deleteOfferByOfferId(sessionID: string, offerId: string): void
    {
        const profileRagfairInfo = this.saveServer.getProfile(sessionID).characters.pmc.RagfairInfo;
        const index = profileRagfairInfo.offers.findIndex(o => o._id === offerId);
        profileRagfairInfo.offers.splice(index, 1);

        this.ragfairOfferService.removeOfferById(offerId);
    }

    protected completeOffer(sessionID: string, offer: IRagfairOffer, boughtAmount: number): IItemEventRouterResponse
    {
        const itemTpl = offer.items[0]._tpl;
        let itemsToSend = [];

        if (offer.sellInOnePiece || boughtAmount === offer.items[0].upd.StackObjectsCount)
        {
            this.deleteOfferByOfferId(sessionID, offer._id);
        }
        else
        {
            offer.items[0].upd.StackObjectsCount -= boughtAmount;
            const rootItems = offer.items.filter(i => i.parentId === "hideout");
            rootItems.splice(0, 1);

            let removeCount = boughtAmount;
            let idsToRemove: string[] = [];

            while (removeCount > 0 && rootItems.length > 0)
            {
                const lastItem = rootItems[rootItems.length - 1];

                if (lastItem.upd.StackObjectsCount > removeCount)
                {
                    lastItem.upd.StackObjectsCount -= removeCount;
                    removeCount = 0;
                }
                else
                {
                    removeCount -= lastItem.upd.StackObjectsCount;
                    idsToRemove.push(lastItem._id);
                    rootItems.splice(rootItems.length - 1, 1);
                }
            }

            let foundNewItems = true;

            while (foundNewItems)
            {
                foundNewItems = false;
                
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for (const id of idsToRemove)
                {
                    const newIds = offer.items.filter(i => !idsToRemove.includes(i._id) && idsToRemove.includes(i.parentId)).map(i => i._id);

                    if (newIds.length > 0)
                    {
                        foundNewItems = true;
                        idsToRemove = [...idsToRemove, ...newIds];
                    }
                }
            }

            if (idsToRemove.length > 0)
            {
                offer.items = offer.items.filter(i => !idsToRemove.includes(i._id));
            }
        }

        // assemble the payment items
        for (const requirement of offer.requirements)
        {
            // Create an item template item
            const requestedItem: Item = {
                _id: this.hashUtil.generate(),
                _tpl: requirement._tpl,
                upd: { StackObjectsCount: requirement.count * boughtAmount }
            };

            const stacks = this.itemHelper.splitStack(requestedItem);

            for (const item of stacks)
            {
                const outItems = [item];

                if (requirement.onlyFunctional)
                {
                    const presetItems = this.ragfairServerHelper.getPresetItemsByTpl(item);

                    if (presetItems.length)
                    {
                        outItems.push(presetItems[0]);
                    }
                }

                itemsToSend = [...itemsToSend, ...outItems];
            }
        }

        // Generate a message to inform that item was sold
        const globalLocales = this.localeService.getLocaleDb();
        const messageTpl = globalLocales[RagfairOfferHelper.goodSoldTemplate];
        const tplVars: ISystemData = {
            soldItem: globalLocales[`${itemTpl} Name`] || itemTpl,
            buyerNickname: this.ragfairServerHelper.getNickname(this.hashUtil.generate()),
            itemCount: boughtAmount
        };
        const messageText = messageTpl.replace(/{\w+}/g, (matched) =>
        {
            return tplVars[matched.replace(/{|}/g, "")];
        });

        const messageContent = this.dialogueHelper.createMessageContext(undefined, MessageType.FLEAMARKET_MESSAGE, this.questConfig.redeemTime);
        messageContent.text = messageText.replace(/"/g, "");
        messageContent.ragfair = {
            offerId: offer._id,
            count: boughtAmount,
            handbookId: itemTpl
        };


        this.dialogueHelper.addDialogueMessage(Traders.RAGMAN, messageContent, sessionID, itemsToSend);
        return this.eventOutputHolder.getOutput(sessionID);
    }

    public isDisplayableOffer(info: ISearchRequestData, itemsToAdd: string[], traderAssorts: Record<string, ITraderAssort>, offer: IRagfairOffer, pmcProfile: IPmcData): boolean
    {
        const item = offer.items[0];
        const money = offer.requirements[0]._tpl;
        const isTraderOffer = offer.user.memberType === MemberCategory.TRADER;
        const isDefaultUserOffer = offer.user.memberType === MemberCategory.DEFAULT;

        if (pmcProfile.Info.Level < this.databaseServer.getTables().globals.config.RagFair.minUserLevel && isDefaultUserOffer)
        {
            // Skip item if player is < global unlock level (default is 15) and item is from a dynamically generated source
            return false;
        }

        if (!!itemsToAdd && !itemsToAdd.includes(item._tpl))
        {
            // skip items we shouldn't include
            return false;
        }

        if (info.offerOwnerType === OfferOwnerType.TRADEROWNERTYPE && !isTraderOffer)
        {
            // don't include player offers
            return false;
        }

        if (info.offerOwnerType === OfferOwnerType.PLAYEROWNERTYPE && isTraderOffer)
        {
            // don't include trader offers
            return false;
        }

        if (info.oneHourExpiration && offer.endTime - this.timeUtil.getTimestamp() > TimeUtil.oneHourAsSeconds)
        {
            // offer doesnt expire within an hour
            return false;
        }

        if (info.quantityFrom > 0 && info.quantityFrom >= item.upd.StackObjectsCount)
        {
            // too little items to offer
            return false;
        }

        if (info.quantityTo > 0 && info.quantityTo <= item.upd.StackObjectsCount)
        {
            // too many items to offer
            return false;
        }

        if (info.onlyFunctional && this.presetHelper.hasPreset(item._tpl) && offer.items.length === 1)
        {
            // don't include non-functional items
            return false;
        }

        if (info.buildCount && this.presetHelper.hasPreset(item._tpl) && offer.items.length > 1)
        {
            // don't include preset items
            return false;
        }

        if (item.upd.MedKit || item.upd.Repairable)
        {
            const itemQualityPercentage = 100 * this.itemHelper.getItemQualityModifier(item);

            if (info.conditionFrom > 0 && info.conditionFrom > itemQualityPercentage)
            {
                // item condition is too low
                return false;
            }

            if (info.conditionTo < 100 && info.conditionTo <= itemQualityPercentage)
            {
                // item condition is too high
                return false;
            }
        }

        // commented out as required search "which is for checking offers that are barters"
        // has info.removeBartering as true, this if statement removed barter items.
        if (info.removeBartering && !this.paymentHelper.isMoneyTpl(money))
        {
            // don't include barter offers
            return false;
        }

        if (info.currency > 0 && this.paymentHelper.isMoneyTpl(money))
        {
            const currencies = ["all", "RUB", "USD", "EUR"];

            if (this.ragfairHelper.getCurrencyTag(money) !== currencies[info.currency])
            {
                // don't include item paid in wrong currency
                return false;
            }
        }

        if (info.priceFrom > 0 && info.priceFrom >= offer.requirementsCost)
        {
            // price is too low
            return false;
        }

        if (info.priceTo > 0 && info.priceTo <= offer.requirementsCost)
        {
            // price is too high
            return false;
        }

        if (isNaN(offer.requirementsCost))
        {
            // don't include offers with null or NaN in it
            return false;
        }

        // handle trader items to remove items that are not available to the user right now
        // required search for "lamp" shows 4 items, 3 of which are not available to a new player
        // filter those out
        if (offer.user.id in this.databaseServer.getTables().traders)
        {
            if (!(offer.user.id in traderAssorts))
            {
                // trader not visible on flea market
                return false;
            }

            if (!traderAssorts[offer.user.id].items.find((item) =>
            {
                return item._id === offer.root;
            }))
            {
                // skip (quest) locked items
                return false;
            }
        }

        return true;
    }
}