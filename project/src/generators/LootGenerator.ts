import { inject, injectable } from "tsyringe";

import { InventoryHelper } from "../helpers/InventoryHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { PresetHelper } from "../helpers/PresetHelper";
import { WeightedRandomHelper } from "../helpers/WeightedRandomHelper";
import { IPreset } from "../models/eft/common/IGlobals";
import { ITemplateItem } from "../models/eft/common/tables/ITemplateItem";
import { AddItem } from "../models/eft/inventory/IAddItemRequestData";
import { BaseClasses } from "../models/enums/BaseClasses";
import { ISealedAirdropContainerSettings, RewardDetails } from "../models/spt/config/IInventoryConfig";
import { LootItem } from "../models/spt/services/LootItem";
import { LootRequest } from "../models/spt/services/LootRequest";
import { ILogger } from "../models/spt/utils/ILogger";
import { DatabaseServer } from "../servers/DatabaseServer";
import { ItemFilterService } from "../services/ItemFilterService";
import { LocalisationService } from "../services/LocalisationService";
import { RagfairLinkedItemService } from "../services/RagfairLinkedItemService";
import { HashUtil } from "../utils/HashUtil";
import { RandomUtil } from "../utils/RandomUtil";

type ItemLimit = {
    current: number,
    max: number
};

@injectable()
export class LootGenerator
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PresetHelper") protected presetHelper: PresetHelper,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("WeightedRandomHelper") protected weightedRandomHelper: WeightedRandomHelper,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("RagfairLinkedItemService") protected ragfairLinkedItemService: RagfairLinkedItemService,
        @inject("ItemFilterService") protected itemFilterService: ItemFilterService
    )
    {}

    /**
     * Generate a list of items based on configuration options parameter
     * @param options parameters to adjust how loot is generated
     * @returns An array of loot items
     */
    public createRandomLoot(options: LootRequest): LootItem[]
    {
        const result: LootItem[] = [];

        const itemTypeCounts = this.initItemLimitCounter(options.itemLimits);

        const tables = this.databaseServer.getTables();
        const itemBlacklist = this.itemFilterService.getBlacklistedItems();
        itemBlacklist.push(...options.itemBlacklist);

        // Handle sealed weapon containers
        const desiredWeaponCrateCount = this.randomUtil.getInt(options.weaponCrateCount.min, options.weaponCrateCount.max);
        if (desiredWeaponCrateCount > 0)
        {
            // Get list of all sealed containers from db
            const sealedWeaponContainerPool = Object.values(tables.templates.items).filter(x => x._name.includes("event_container_airdrop"));
            
            for (let index = 0; index < desiredWeaponCrateCount; index++)
            {
                // Choose one at random + add to results array
                const chosenSealedContainer = this.randomUtil.getArrayValue(sealedWeaponContainerPool);
                result.push({
                    id: this.hashUtil.generate(),
                    tpl: chosenSealedContainer._id,
                    isPreset: false,
                    stackCount: 1
                });
            }
        }

        // Get items from items.json that have a type of item + not in global blacklist + basetype is in whitelist
        const items = Object.entries(tables.templates.items).filter(x => !itemBlacklist.includes(x[1]._id) 
            && x[1]._type.toLowerCase() === "item" 
            && !x[1]._props.QuestItem
            && options.itemTypeWhitelist.includes(x[1]._parent));

        const randomisedItemCount = this.randomUtil.getInt(options.itemCount.min, options.itemCount.max);
        for (let index = 0; index < randomisedItemCount; index++)
        {
            if (!this.findAndAddRandomItemToLoot(items, itemTypeCounts, options, result))
            {
                index--;
            }   
        }

        const globalDefaultPresets = Object.entries(tables.globals.ItemPresets).filter(x => x[1]._encyclopedia !== undefined);
        const randomisedPresetCount = this.randomUtil.getInt(options.presetCount.min, options.presetCount.max);
        for (let index = 0; index < randomisedPresetCount; index++)
        {
            if (!this.findAndAddRandomPresetToLoot(globalDefaultPresets, itemTypeCounts, itemBlacklist, result))
            {
                index--;
            }
        }

        return result;
    }

    /**
     * Construct item limit record to hold max and current item count for each item type
     * @param limits limits as defined in config
     * @returns record, key: item tplId, value: current/max item count allowed
     */
    protected initItemLimitCounter(limits: Record<string, number>): Record<string, ItemLimit>
    {
        const itemTypeCounts: Record<string, ItemLimit> = {};
        for (const itemTypeId in limits)
        {
            itemTypeCounts[itemTypeId] = {
                current: 0,
                max: limits[itemTypeId]
            };
        }

        return itemTypeCounts;
    }

    /**
     * Find a random item in items.json and add to result array
     * @param items items to choose from
     * @param itemTypeCounts item limit counts
     * @param options item filters
     * @param result array to add found item to
     * @returns true if item was valid and added to pool
     */
    protected findAndAddRandomItemToLoot(
        items: [string, ITemplateItem][],
        itemTypeCounts: Record<string, { current: number; max: number; }>,
        options: LootRequest,
        result: LootItem[]): boolean
    {
        const randomItem = this.randomUtil.getArrayValue(items)[1];

        const itemLimitCount = itemTypeCounts[randomItem._parent];
        if (itemLimitCount && itemLimitCount.current > itemLimitCount.max)
        {
            return false;
        }

        const newLootItem: LootItem = {
            id: this.hashUtil.generate(),
            tpl: randomItem._id,
            isPreset: false,
            stackCount: 1
        };

        // Check if armor has level in allowed whitelist
        if (randomItem._parent === BaseClasses.ARMOR 
            || randomItem._parent === BaseClasses.VEST)
        {
            if (!options.armorLevelWhitelist.includes(Number(randomItem._props.armorClass)))
            {
                return false; 
            }
        }

        // Special case - handle items that need a stackcount > 1
        if (randomItem._props.StackMaxSize > 1)
        {
            newLootItem.stackCount = this.getRandomisedStackCount(randomItem, options);
        }
        
        newLootItem.tpl = randomItem._id;
        result.push(newLootItem);

        if (itemLimitCount)
        {
            // Increment item count as it's in limit array
            itemLimitCount.current++;
        }

        // Item added okay
        return true;
    }

    /**
     * Get a randomised stack count for an item between its StackMinRandom and StackMaxSize values
     * @param item item to get stack count of
     * @param options loot options
     * @returns stack count
     */
    protected getRandomisedStackCount(item: ITemplateItem, options: LootRequest): number
    {
        let min = item._props.StackMinRandom;
        let max = item._props.StackMaxSize;

        if (options.itemStackLimits[item._id])
        {
            min = options.itemStackLimits[item._id].min;
            max = options.itemStackLimits[item._id].max;
        }

        return this.randomUtil.getInt(min, max);
    }

    /**
     * Find a random item in items.json and add to result array
     * @param globalDefaultPresets presets to choose from
     * @param itemTypeCounts item limit counts
     * @param itemBlacklist items to skip
     * @param result array to add found preset to
     * @returns true if preset was valid and added to pool
     */
    protected findAndAddRandomPresetToLoot(
        globalDefaultPresets: [string, IPreset][],
        itemTypeCounts: Record<string, { current: number; max: number; }>,
        itemBlacklist: string[],
        result: LootItem[]): boolean
    {
        // Choose random preset and get details from item.json using encyclopedia value (encyclopedia === tplId)
        const randomPreset = this.randomUtil.getArrayValue(globalDefaultPresets)[1];
        const itemDetails = this.databaseServer.getTables().templates.items[randomPreset._encyclopedia];

        // Skip blacklisted items
        if (itemBlacklist.includes(randomPreset._items[0]._tpl))
        {
            return false;
        }

        // Some custom mod items are lacking a parent property
        if (!itemDetails._parent)
        {
            this.logger.error(this.localisationService.getText("loot-item_missing_parentid", itemDetails._name));

            return false;
        }

        // Check picked preset hasn't exceeded spawn limit
        const itemLimitCount = itemTypeCounts[itemDetails._parent];
        if (itemLimitCount && itemLimitCount.current > itemLimitCount.max)
        {
            return false;
        }

        const newLootItem: LootItem = {
            tpl: randomPreset._items[0]._tpl,
            isPreset: true,
            stackCount: 1
        };
    
        result.push(newLootItem);

        if (itemLimitCount)
        {
            // increment item count as its in limit array
            itemLimitCount.current++;
        }
        
        // item added okay
        return true;
    }

    /**
     * Sealed weapon containers have a weapon + associated mods inside them + assortment of other things (food/meds)
     * @param containerSettings sealed weapon container settings
     * @returns Array of items to add to player inventory
     */
    public getSealedWeaponCaseLoot(containerSettings: ISealedAirdropContainerSettings): AddItem[]
    {
        const itemsToReturn: AddItem[] = [];

        // choose a weapon to give to the player (weighted)
        const chosenWeaponTpl = this.weightedRandomHelper.getWeightedInventoryItem(containerSettings.weaponRewardWeight);
        const weaponDetailsDb = this.itemHelper.getItem(chosenWeaponTpl);
        if (!weaponDetailsDb[0])
        {
            this.logger.warning(`Non-item was picked as reward ${chosenWeaponTpl}, unable to continue`);

            return itemsToReturn;
        }
        
        // Get weapon preset - default or choose a random one from all possible
        const chosenWeaponPreset = containerSettings.defaultPresetsOnly
            ? this.presetHelper.getDefaultPreset(chosenWeaponTpl)
            : this.randomUtil.getArrayValue(this.presetHelper.getPresets(chosenWeaponTpl));

        // Add preset to return object
        itemsToReturn.push({
            count: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            item_id: chosenWeaponPreset._id,
            isPreset: true
        });

        // Get items related to chosen weapon
        const linkedItemsToWeapon = this.ragfairLinkedItemService.getLinkedDbItems(chosenWeaponTpl);
        itemsToReturn.push(...this.getSealedContainerWeaponModRewards(containerSettings, linkedItemsToWeapon, chosenWeaponPreset));

        // Handle non-weapon mod reward types
        itemsToReturn.push(...this.getSealedContainerNonWeaponModRewards(containerSettings, weaponDetailsDb[1]));

        return itemsToReturn;
    }

    /**
     * Get non-weapon mod rewards for a sealed container
     * @param containerSettings Sealed weapon container settings
     * @param weaponDetailsDb Details for the weapon to reward player
     * @returns AddItem array
     */
    protected getSealedContainerNonWeaponModRewards(containerSettings: ISealedAirdropContainerSettings, weaponDetailsDb: ITemplateItem): AddItem[]
    {
        const rewards: AddItem[] = [];

        for (const rewardTypeId in containerSettings.rewardTypeLimits)
        {
            const settings = containerSettings.rewardTypeLimits[rewardTypeId];
            const rewardCount = this.randomUtil.getInt(settings.min, settings.max);

            if (rewardCount === 0)
            {
                continue;
            }

            // Edge case - ammo boxes
            if (rewardTypeId === BaseClasses.AMMO_BOX)
            {
                // Get ammoboxes from db
                const ammoBoxesDetails = containerSettings.ammoBoxWhitelist.map(x =>
                {
                    const itemDetails = this.itemHelper.getItem(x);
                    return itemDetails[1];
                });
                
                // Need to find boxes that matches weapons caliber
                const weaponCaliber = weaponDetailsDb._props.ammoCaliber;
                const ammoBoxesMatchingCaliber = ammoBoxesDetails.filter(x => x._props.ammoCaliber === weaponCaliber);
                if (ammoBoxesMatchingCaliber.length === 0)
                {
                    this.logger.debug(`No ammo box with caliber ${weaponCaliber} found, skipping`);

                    continue;
                }

                // No need to add ammo to box, inventoryHelper.addItem() will handle it
                const chosenAmmoBox = this.randomUtil.getArrayValue(ammoBoxesMatchingCaliber);
                rewards.push({
                    count: rewardCount,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    item_id: chosenAmmoBox._id,
                    isPreset: false
                });

                continue;
            }

            // Get all items of the desired type + not quest items + not globally blacklisted
            const possibleRewardItems = Object.values(this.databaseServer.getTables().templates.items)
                .filter(x => x._parent === rewardTypeId
                    && x._type.toLowerCase() === "item"
                    && !this.itemFilterService.isItemBlacklisted(x._id)
                    && !x._props.QuestItem);

            if (possibleRewardItems.length === 0)
            {
                this.logger.debug(`No items with base type of ${rewardTypeId} found, skipping`);

                continue;
            }

            for (let index = 0; index < rewardCount; index++)
            {
                // choose a random item from pool
                const chosenRewardItem = this.randomUtil.getArrayValue(possibleRewardItems);
                this.addOrIncrementItemToArray(chosenRewardItem._id, rewards);         
            }
        }

        return rewards;
    }

    /**
     * Iterate over the container weaponModRewardLimits settings and create an array of weapon mods to reward player
     * @param containerSettings Sealed weapon container settings
     * @param linkedItemsToWeapon All items that can be attached/inserted into weapon
     * @param chosenWeaponPreset The weapon preset given to player as reward
     * @returns AddItem array
     */
    protected getSealedContainerWeaponModRewards(containerSettings: ISealedAirdropContainerSettings, linkedItemsToWeapon: ITemplateItem[], chosenWeaponPreset: IPreset): AddItem[]
    {
        const modRewards: AddItem[] = [];
        for (const rewardTypeId in containerSettings.weaponModRewardLimits)
        {
            const settings = containerSettings.weaponModRewardLimits[rewardTypeId];
            const rewardCount = this.randomUtil.getInt(settings.min, settings.max);

            // Nothing to add, skip reward type
            if (rewardCount === 0)
            {
                continue;
            }

            // Get items that fulfil reward type criteral from items that fit on gun
            const relatedItems = linkedItemsToWeapon.filter(x => x._parent === rewardTypeId);
            if (!relatedItems || relatedItems.length === 0)
            {
                this.logger.debug(`no items found to fulfil reward type ${rewardTypeId} for weapon: ${chosenWeaponPreset._name}, skipping`);
                continue;
            }

            // Find a random item of the desired type and add as reward
            for (let index = 0; index < rewardCount; index++) 
            {
                const chosenItem = this.randomUtil.drawRandomFromList(relatedItems);
                this.addOrIncrementItemToArray(chosenItem[0]._id, modRewards);
            }
        }

        return modRewards;
    }

    /**
     * Handle event-related loot containers - currently just the halloween jack-o-lanterns that give food rewards
     * @param rewardContainerDetails 
     * @returns AddItem array
     */
    public getRandomLootContainerLoot(rewardContainerDetails: RewardDetails): AddItem[]
    {
        const itemsToReturn: AddItem[] = [];

        // Get random items and add to newItemRequest
        for (let index = 0; index < rewardContainerDetails.rewardCount; index++)
        {
            // Pick random reward from pool, add to request object
            const chosenRewardItemTpl = this.weightedRandomHelper.getWeightedInventoryItem(rewardContainerDetails.rewardTplPool);
            this.addOrIncrementItemToArray(chosenRewardItemTpl, itemsToReturn);
        }

        return itemsToReturn;
    }

    /**
     * A bug in inventoryHelper.addItem() means you cannot add the same item to the array twice with a count of 1, it causes duplication
     * Default adds 1, or increments count
     * @param itemTplToAdd items tpl we want to add to array
     * @param resultsArray Array to add item tpl to
     */
    protected addOrIncrementItemToArray(itemTplToAdd: string, resultsArray: AddItem[]): void
    {
        const existingItemIndex = resultsArray.findIndex(x => x.item_id === itemTplToAdd);
        if (existingItemIndex > -1)
        {
            // Exists in array already, increment count
            resultsArray[existingItemIndex].count++;
        }
        else
        {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            resultsArray.push({item_id: itemTplToAdd, count: 1, isPreset: false});
        }
    }
}