import { inject, injectable } from "tsyringe";

import { BotHelper } from "../helpers/BotHelper";
import { Config } from "../models/eft/common/IGlobals";
import { Inventory } from "../models/eft/common/tables/IBotType";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { ISeasonalEvent, ISeasonalEventConfig } from "../models/spt/config/ISeasonalEventConfig";
import { ILocationData } from "../models/spt/server/ILocations";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { LocalisationService } from "./LocalisationService";

@injectable()
export class SeasonalEventService
{
    protected seasonalEventConfig: ISeasonalEventConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("BotHelper") protected botHelper: BotHelper,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.seasonalEventConfig = this.configServer.getConfig(ConfigTypes.SEASONAL_EVENT);
    }

    protected get events(): Record<string, string>
    {
        return {
            "None": "None",
            "Christmas": "Christmas",
            "Halloween": "Halloween"
        };
    }

    protected get christmasEventItems(): string[]
    {
        return [
            "5c1a1e3f2e221602b66cc4c2", // White beard
            "5df8a6a186f77412640e2e80", // Red bauble
            "5df8a77486f77412672a1e3f", // Violet bauble
            "5df8a72c86f77412640e2e83", // Silver bauble
            "5a43943586f77416ad2f06e2", // Ded moroz hat
            "5a43957686f7742a2c2f11b0" // Santa hat
        ];
    }

    protected get halloweenEventItems(): string[]
    {
        return [
            "635267ab3c89e2112001f826", // Halloween skull mask
            "634959225289190e5e773b3b", // Pumpkin loot box
            "59ef13ca86f77445fd0e2483" // Jack'o'lantern helmet
        ];
    }

    /**
     * Get an array of christmas items found in bots inventories as loot
     * @returns array
     */
    public getChristmasEventItems(): string[]
    {
        return this.christmasEventItems;
    }

    /**
     * Get an array of halloween items found in bots inventories as loot
     * @returns array
     */
    public getHalloweenEventItems(): string[]
    {
        return this.halloweenEventItems;
    }

    public itemIsChristmasRelated(itemTpl: string): boolean
    {
        return this.christmasEventItems.includes(itemTpl);
    }

    public itemIsHalloweenRelated(itemTpl: string): boolean
    {
        return this.halloweenEventItems.includes(itemTpl);
    }

    /**
     * Check if item id exists in christmas or halloween event arrays
     * @param itemTpl item tpl to check for
     * @returns 
     */
    public itemIsSeasonalRelated(itemTpl: string): boolean
    {
        return this.christmasEventItems.includes(itemTpl) || this.halloweenEventItems.includes(itemTpl);
    }

    /**
     * Get an array of items that appear during a seasonal event
     * returns multiple seasonal event items if they are both active
     * @returns array of tpl strings
     */
    public getAllSeasonalEventItems(): string[]
    {
        const items = [];

        if (!this.christmasEventEnabled())
        {
            items.push(...this.christmasEventItems);
        }

        if (!this.halloweenEventEnabled())
        {
            items.push(...this.halloweenEventItems);
        }

        return items;
    }

    /**
     * Get an array of seasonal items that should be blocked as seasonal is not active
     * @returns Array of tpl strings
     */
    public getSeasonalEventItemsToBlock(): string[]
    {
        const items = [];

        if (!this.christmasEventEnabled())
        {
            items.push(...this.christmasEventItems);
        }

        if (!this.halloweenEventEnabled())
        {
            items.push(...this.halloweenEventItems);
        }

        return items;
    }

    /**
     * Is a seasonal event currently active
     * @returns true if event is active
     */
    public seasonalEventEnabled(): boolean
    {
        return this.databaseServer.getTables().globals.config.EventType.includes(this.events.Christmas) ||
            this.databaseServer.getTables().globals.config.EventType.includes(this.events.Halloween);
    }

    /**
     * is christmas event active
     * @returns true if active
     */
    public christmasEventEnabled(): boolean
    {
        return this.databaseServer.getTables().globals.config.EventType.includes(this.events.Christmas);
    }

    /**
     * is christmas event active
     * @returns true if active
     */
    public halloweenEventEnabled(): boolean
    {
        return this.databaseServer.getTables().globals.config.EventType.includes(this.events.Halloween);
    }

    /**
     * Is detection of seasonal events enabled (halloween / christmas)
     * @returns true if seasonal events should be checked for
     */
    public isAutomaticEventDetectionEnabled(): boolean
    {
        return this.seasonalEventConfig.enableSeasonalEventDetection;
    }

    /**
     * Get a dictionary of gear changes to apply to bots for a specific event e.g. Christmas/Halloween
     * @param eventName Name of event to get gear changes for
     * @returns bots with equipment changes
     */
    protected getEventBotGear(eventName: string): Record<string, Record<string, Record<string, number>>>
    {
        return this.seasonalEventConfig.eventGear[eventName.toLowerCase()];
    }

    /**
     * Get the dates each seasonal event starts and ends at
     * @returns Record with event name + start/end date
     */
    public getEventDetails(): ISeasonalEvent[]
    {
        return this.seasonalEventConfig.events;
    }

    /**
     * Check if current date falls inside any of the seasons events pased in, if so, handle them
     */
    public checkForAndEnableSeasonalEvents(): void
    {
        const globalConfig = this.databaseServer.getTables().globals.config;
        const currentDate = new Date();
        const seasonalEvents = this.getEventDetails();

        for (const event of seasonalEvents)
        {
            const eventStartDate = new Date(currentDate.getFullYear(), event.startMonth - 1, event.startDay);
            const eventEndDate = new Date(currentDate.getFullYear(), event.endMonth - 1, event.endDay);

            // Current date is between start/end dates
            if (currentDate >= eventStartDate
                && currentDate <= eventEndDate)
            {
                this.updateGlobalEvents(globalConfig, event.name);
            }
        }
    }

    /**
     * Iterate through bots inventory and loot to find and remove christmas items (as defined in SeasonalEventService)
     * @param nodeInventory Bots inventory to iterate over
     * @param botRole the role of the bot being processed
     */
    public removeChristmasItemsFromBotInventory(nodeInventory: Inventory, botRole: string): void
    {
        const christmasItems = this.getChristmasEventItems();
        const equipmentSlotsToFilter = ["FaceCover", "Headwear", "Backpack", "TacticalVest"];
        const lootContainersToFilter = ["Backpack", "Pockets", "TacticalVest"];

        // Remove christmas related equipment
        for (const equipmentSlotKey of equipmentSlotsToFilter)
        {
            if (!nodeInventory.equipment[equipmentSlotKey])
            {
                this.logger.warning(this.localisationService.getText("seasonal-missing_equipment_slot_on_bot", {equipmentSlot: equipmentSlotKey, botRole: botRole}));
            }

            const equipment: Record<string, number> = nodeInventory.equipment[equipmentSlotKey];
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            nodeInventory.equipment[equipmentSlotKey] = Object.fromEntries(Object.entries(equipment).filter(([index]) => !christmasItems.includes(index)));
        }

        // Remove christmas related loot from loot containers
        for (const lootContainerKey of lootContainersToFilter)
        {
            if (!nodeInventory.items[lootContainerKey])
            {
                this.logger.warning(this.localisationService.getText("seasonal-missing_loot_container_slot_on_bot", {lootContainer: lootContainerKey, botRole: botRole}));
            }

            nodeInventory.items[lootContainerKey] = nodeInventory.items[lootContainerKey].filter((x: string) => !christmasItems.includes(x));
        }
    }

    /**
     * Make adjusted to server code based on the name of the event passed in
     * @param globalConfig globals.json
     * @param eventName Name of the event to enable. e.g. Christmas
     */
    protected updateGlobalEvents(globalConfig: Config, eventName: string): void
    {
        switch (eventName.toLowerCase())
        {
            case "halloween":
                globalConfig.EventType = globalConfig.EventType.filter(x => x !== "None");
                globalConfig.EventType.push("Halloween");
                globalConfig.EventType.push("HalloweenIllumination");
                globalConfig.Health.ProfileHealthSettings.DefaultStimulatorBuff = "Buffs_Halloween";
                this.addEventGearToBots("halloween");
                this.addPumpkinsToScavBackpacks();
                break;
            case "christmas":
                globalConfig.EventType = globalConfig.EventType.filter(x => x !== "None");
                globalConfig.EventType.push("Christmas");
                this.addEventGearToBots("christmas");
                this.addGifterBotToMaps();
                this.addLootItemsToGifterDropItemsList();
                this.enableDancingTree();
                break;
            default:
                // Likely a mod event
                this.addEventGearToBots(eventName.toLowerCase());
                break;
        }
    }

    /**
     * Add lootble items from backpack into patrol.ITEMS_TO_DROP difficulty property
     */
    protected addLootItemsToGifterDropItemsList(): void
    {
        const gifterBot = this.databaseServer.getTables().bots.types["gifter"];
        for (const difficulty in gifterBot.difficulty)
        {
            gifterBot.difficulty[difficulty].Patrol["ITEMS_TO_DROP"] = gifterBot.inventory.items.Backpack.join(", ");
        }
    }

    /**
     * Read in data from seasonalEvents.json and add found equipment items to bots
     * @param eventName Name of the event to read equipment in from config
     */
    protected addEventGearToBots(eventName: string): void
    {
        const botGearChanges = this.getEventBotGear(eventName);
        if (!botGearChanges)
        {
            this.logger.warning(this.localisationService.getText("gameevent-no_gear_data", eventName));

            return;
        }
        
        // Iterate over bots with changes to apply
        for (const bot in botGearChanges)
        {
            const botToUpdate = this.databaseServer.getTables().bots.types[bot.toLowerCase()];
            if (!botToUpdate)
            {
                this.logger.warning(this.localisationService.getText("gameevent-bot_not_found", bot));
                continue;
            }

            // Iterate over each equipment slot change
            const gearAmendments = botGearChanges[bot];
            for (const equipmentSlot in gearAmendments)
            {
                // Grab gear to add and loop over it
                const itemsToAdd = gearAmendments[equipmentSlot];
                for (const itemTplIdToAdd in itemsToAdd)
                {
                    botToUpdate.inventory.equipment[equipmentSlot][itemTplIdToAdd] = itemsToAdd[itemTplIdToAdd];
                }
            }
        }
    }

    protected addPumpkinsToScavBackpacks(): void
    {
        const assaultBackpack = this.databaseServer.getTables().bots.types["assault"].inventory.items.Backpack;
        assaultBackpack.push("634959225289190e5e773b3b");
        assaultBackpack.push("634959225289190e5e773b3b");
        assaultBackpack.push("634959225289190e5e773b3b");
    }

    /**
     * Set Khorovod(dancing tree) chance to 100% on all maps that support it
     */
    protected enableDancingTree(): void
    {
        const maps = this.databaseServer.getTables().locations;
        for (const mapName in maps)
        {
            // Skip maps that have no tree
            if (["hideout", "base", "privatearea"].includes(mapName))
            {
                continue;
            }

            const mapData: ILocationData = maps[mapName];
            if (mapData?.base?.BotLocationModifier && "KhorovodChance" in mapData.base.BotLocationModifier)
            {
                mapData.base.BotLocationModifier.KhorovodChance = 100;
            }
        }
    }

    /**
     * Add santa to maps
     */
    protected addGifterBotToMaps(): void
    {
        const gifterSettings = this.seasonalEventConfig.gifterSettings;
        const maps = this.databaseServer.getTables().locations;
        for (const gifterMapSettings of gifterSettings)
        {
            const mapData: ILocationData = maps[gifterMapSettings.map];
            mapData.base.BossLocationSpawn.push({
                BossName: "gifter",
                BossChance: gifterMapSettings.spawnChance,
                BossZone: gifterMapSettings.zones,
                BossPlayer: false,
                BossDifficult: "normal",
                BossEscortType: "gifter",
                BossEscortDifficult: "normal",
                BossEscortAmount: "0",
                Time: -1,
                TriggerId: "",
                TriggerName: "",
                Delay: 0,
                RandomTimeSpawn: false
            });
        }
    }
}