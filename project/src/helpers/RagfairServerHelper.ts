import { inject, injectable } from "tsyringe";

import { Item } from "../models/eft/common/tables/IItem";
import { ITemplateItem } from "../models/eft/common/tables/ITemplateItem";
import { BaseClasses } from "../models/enums/BaseClasses";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { MemberCategory } from "../models/enums/MemberCategory";
import { MessageType } from "../models/enums/MessageType";
import { Traders } from "../models/enums/Traders";
import { IQuestConfig } from "../models/spt/config/IQuestConfig";
import { IRagfairConfig } from "../models/spt/config/IRagfairConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { SaveServer } from "../servers/SaveServer";
import { ItemFilterService } from "../services/ItemFilterService";
import { LocaleService } from "../services/LocaleService";
import { MailSendService } from "../services/MailSendService";
import { HashUtil } from "../utils/HashUtil";
import { JsonUtil } from "../utils/JsonUtil";
import { RandomUtil } from "../utils/RandomUtil";
import { TimeUtil } from "../utils/TimeUtil";
import { DialogueHelper } from "./DialogueHelper";
import { ItemHelper } from "./ItemHelper";
import { ProfileHelper } from "./ProfileHelper";
import { TraderHelper } from "./TraderHelper";

/**
 * Helper class for common ragfair server actions
 */
@injectable()
export class RagfairServerHelper
{
    protected ragfairConfig: IRagfairConfig;
    protected questConfig: IQuestConfig;
    protected static goodsReturnedTemplate = "5bdabfe486f7743e1665df6e 0"; // Your item was not sold

    constructor(
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("LocaleService") protected localeService: LocaleService,
        @inject("DialogueHelper") protected dialogueHelper: DialogueHelper,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("MailSendService") protected mailSendService: MailSendService,
        @inject("ItemFilterService") protected itemFilterService: ItemFilterService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
        this.questConfig = this.configServer.getConfig(ConfigTypes.QUEST);
    }

    /**
     * Is item valid / on blacklist / quest item
     * @param itemDetails 
     * @returns boolean
     */
    public isItemValidRagfairItem(itemDetails: [boolean, ITemplateItem]): boolean
    {
        const blacklistConfig = this.ragfairConfig.dynamic.blacklist;

        // Skip invalid items
        if (!itemDetails[0])
        {
            return false;
        }

        // Skip blacklisted items
        if (this.itemFilterService.isItemBlacklisted(itemDetails[1]._id))
        {
            return false;
        }

        // Skip bsg blacklisted items
        if (blacklistConfig.enableBsgList && !itemDetails[1]._props.CanSellOnRagfair)
        {
            return false;
        }

        // Skip custom blacklisted items
        if (this.isItemOnCustomFleaBlacklist(itemDetails[1]._id))
        {
            return false;
        }

        // Skip quest items
        if (blacklistConfig.enableQuestList && this.itemHelper.isQuestItem(itemDetails[1]._id))
        {
            return false;
        }

        // Don't include damaged ammo packs
        if (this.ragfairConfig.dynamic.blacklist.damagedAmmoPacks && itemDetails[1]._parent === BaseClasses.AMMO_BOX && itemDetails[1]._name.includes("_damaged"))
        {
            return false;
        }

        return true;
    }

    /**
     * Is supplied item tpl on the ragfair custom blacklist from configs/ragfair.json/dynamic
     * @param itemTemplateId Item tpl to check is blacklisted
     * @returns True if its blacklsited
     */
    protected isItemOnCustomFleaBlacklist(itemTemplateId: string): boolean
    {
        if (!this.itemHelper.isValidItem(itemTemplateId))
        {
            return true;
        }

        return this.ragfairConfig.dynamic.blacklist.custom.includes(itemTemplateId);
    }

    /**
     * is supplied id a trader
     * @param traderId 
     * @returns True if id was a trader
     */
    public isTrader(traderId: string): boolean
    {
        return traderId in this.databaseServer.getTables().traders;
    }

    /**
     * Is this user id the logged in player
     * @param userId Id to test
     * @returns True is the current player
     */
    public isPlayer(userId: string): boolean
    {
        if (this.profileHelper.getPmcProfile(userId) !== undefined)
        {
            return true;
        }
        return false;
    }

    /**
     * Send items back to player
     * @param sessionID Player to send items to
     * @param returnedItems Items to send to player
     */
    public returnItems(sessionID: string, returnedItems: Item[]): void
    {
        this.mailSendService.sendLocalisedNpcMessageToPlayer(
            sessionID,
            this.traderHelper.getTraderById(Traders.RAGMAN),
            MessageType.MESSAGE_WITH_ITEMS,
            RagfairServerHelper.goodsReturnedTemplate,
            returnedItems,
            this.timeUtil.getHoursAsSeconds(this.questConfig.redeemTime)
        );
    }

    public calculateDynamicStackCount(tplId: string, isWeaponPreset: boolean): number
    {
        const config = this.ragfairConfig.dynamic;

        // Lookup item details - check if item not found
        const itemDetails = this.itemHelper.getItem(tplId);
        if (!itemDetails[0])
        {
            throw new Error(`Item with tpl ${tplId} not found. Unable to generate a dynamic stack count.`);
        }

        // Item Types to return one of
        if (isWeaponPreset || this.itemHelper.isOfBaseclasses(itemDetails[1]._id, this.ragfairConfig.dynamic.showAsSingleStack))
        {
            return 1;
        }

        // Get max stack count
        const maxStackCount = itemDetails[1]._props.StackMaxSize;

        // non-stackable - use different values to calculate stack size
        if (!maxStackCount || maxStackCount === 1)
        {
            return Math.round(this.randomUtil.getInt(config.nonStackableCount.min, config.nonStackableCount.max));
        }

        const stackPercent = Math.round(this.randomUtil.getInt(config.stackablePercent.min, config.stackablePercent.max));

        return Math.round((maxStackCount / 100) * stackPercent);
    }

    /**
     * Choose a currency at random with bias
     * @returns currency tpl
     */
    public getDynamicOfferCurrency(): string
    {
        const currencies = this.ragfairConfig.dynamic.currencies;
        const bias: string[] = [];

        for (const item in currencies)
        {
            for (let i = 0; i < currencies[item]; i++)
            {
                bias.push(item);
            }
        }

        return bias[Math.floor(Math.random() * bias.length)];
    }

    public getMemberType(userID: string): MemberCategory
    {
        if (this.isPlayer(userID))
        {
            // player offer
            return this.saveServer.getProfile(userID).characters.pmc.Info.AccountType;
        }

        if (this.isTrader(userID))
        {
            // trader offer
            return MemberCategory.TRADER;
        }

        // generated offer
        return MemberCategory.DEFAULT;
    }

    public getNickname(userID: string): string
    {
        if (this.isPlayer(userID))
        {
            // player offer
            return this.saveServer.getProfile(userID).characters.pmc.Info.Nickname;
        }

        if (this.isTrader(userID))
        {
            // trader offer
            return this.databaseServer.getTables().traders[userID].base.nickname;
        }

        // generated offer
        // recurivse if name is longer than max characters allowed (15 characters)
        const type = (this.randomUtil.getInt(0, 1) === 0) ? "usec" : "bear";
        const name = this.randomUtil.getStringArrayValue(this.databaseServer.getTables().bots.types[type].firstName);
        return (name.length > 15) ? this.getNickname(userID) : name;
    }

    public getPresetItems(item: any): Item[]
    {
        const preset = this.jsonUtil.clone(this.databaseServer.getTables().globals.ItemPresets[item._id]._items);
        return this.reparentPresets(item, preset);
    }

    public getPresetItemsByTpl(item: Item): Item[]
    {
        const presets = [];

        for (const itemId in this.databaseServer.getTables().globals.ItemPresets)
        {
            if (this.databaseServer.getTables().globals.ItemPresets[itemId]._items[0]._tpl === item._tpl)
            {
                const presetItems = this.jsonUtil.clone(this.databaseServer.getTables().globals.ItemPresets[itemId]._items);
                presets.push(this.reparentPresets(item, presetItems));
            }
        }

        return presets;
    }

    /**
     * Generate new unique ids for the children while preserving hierarchy
     * @param item base item
     * @param preset 
     * @returns Item array with new IDs
     */
    public reparentPresets(item: Item, preset: Item[]): Item[]
    {
        const oldRootId = preset[0]._id;
        const idMappings = {};

        idMappings[oldRootId] = item._id;

        for (const mod of preset)
        {
            if (idMappings[mod._id] === undefined)
            {
                idMappings[mod._id] = this.hashUtil.generate();
            }

            if (mod.parentId !== undefined && idMappings[mod.parentId] === undefined)
            {
                idMappings[mod.parentId] = this.hashUtil.generate();
            }

            mod._id =  idMappings[mod._id];

            if (mod.parentId !== undefined)
            {
                mod.parentId =  idMappings[mod.parentId];
            }
        }

        // force item's details into first location of presetItems
        preset[0] = item;

        return preset;
    }
}