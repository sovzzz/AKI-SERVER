import { inject, injectable } from "tsyringe";

import { LocationGenerator } from "../generators/LocationGenerator";
import { LootGenerator } from "../generators/LootGenerator";
import { WeightedRandomHelper } from "../helpers/WeightedRandomHelper";
import { ILocation } from "../models/eft/common/ILocation";
import { ILocationBase } from "../models/eft/common/ILocationBase";
import {
    ILocationsGenerateAllResponse
} from "../models/eft/common/ILocationsSourceDestinationBase";
import { ILooseLoot, SpawnpointTemplate } from "../models/eft/common/ILooseLoot";
import { IAirdropLootResult } from "../models/eft/location/IAirdropLootResult";
import { AirdropTypeEnum } from "../models/enums/AirdropType";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IAirdropConfig } from "../models/spt/config/IAirdropConfig";
import { ILocations } from "../models/spt/server/ILocations";
import { LootRequest } from "../models/spt/services/LootRequest";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { LocalisationService } from "../services/LocalisationService";
import { HashUtil } from "../utils/HashUtil";
import { JsonUtil } from "../utils/JsonUtil";
import { TimeUtil } from "../utils/TimeUtil";

@injectable()
export class LocationController
{
    protected airdropConfig: IAirdropConfig;

    constructor(
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("WeightedRandomHelper") protected weightedRandomHelper: WeightedRandomHelper,
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("LocationGenerator") protected locationGenerator: LocationGenerator,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("LootGenerator") protected lootGenerator: LootGenerator,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.airdropConfig = this.configServer.getConfig(ConfigTypes.AIRDROP);
    }

    /*  */

    /**
     * Handle client/location/getLocalloot
     * Get a location (map) with generated loot data
     * @param location Map to generate loot for
     * @returns ILocationBase
     */
    public get(location: string): ILocationBase
    {
        const name = location.toLowerCase().replace(" ", "");
        return this.generate(name);
    }

    /* generates a random location preset to use for local session */
    private generate(name: string): ILocationBase
    {
        const location: ILocation = this.databaseServer.getTables().locations[name];
        const output: ILocationBase = this.jsonUtil.clone(location.base);
        // const ids = {};

        output.UnixDateTime = this.timeUtil.getTimestamp();

        // don't generate loot on hideout
        if (name === "hideout")
        {
            return output;
        }

        const locationName = location.base.Name;

        // Copy loot data
        const staticWeapons = this.jsonUtil.clone(this.databaseServer.getTables().loot.staticContainers[locationName].staticWeapons);
        const staticContainers = this.jsonUtil.clone(this.databaseServer.getTables().loot.staticContainers[locationName].staticContainers);
        const staticForced = this.jsonUtil.clone(this.databaseServer.getTables().loot.staticContainers[locationName].staticForced);
        const staticLootDist = this.jsonUtil.clone(this.databaseServer.getTables().loot.staticLoot);
        const staticAmmoDist = this.jsonUtil.clone(this.databaseServer.getTables().loot.staticAmmo);

        output.Loot = [];

        // Mounted weapons
        for (const mi of staticWeapons)
        {
            output.Loot.push(mi);
        }

        let staticContainerCount = 0;
        // static loot
        for (const staticContainer of staticContainers)
        {
            const container = this.locationGenerator.generateContainerLoot(staticContainer, staticForced, staticLootDist, staticAmmoDist, name);
            output.Loot.push(container);
            staticContainerCount++;
        }

        this.logger.success(this.localisationService.getText("location-containers_generated_success", staticContainerCount));

        // dyanmic loot
        const dynamicLootDist: ILooseLoot = this.jsonUtil.clone(location.looseLoot);
        const dynamicLoot: SpawnpointTemplate[] = this.locationGenerator.generateDynamicLoot(dynamicLootDist, staticAmmoDist, name);
        for (const dli of dynamicLoot)
        {
            output.Loot.push(dli);
        }

        // done generating
        this.logger.success(this.localisationService.getText("location-dynamic_items_spawned_success", dynamicLoot.length));
        this.logger.success(this.localisationService.getText("location-generated_success", name));

        return output;
    }

    /**
     * Handle client/locations
     * Get all maps base location properties without loot data
     * @returns ILocationsGenerateAllResponse
     */
    public generateAll(): ILocationsGenerateAllResponse
    {
        const locationsFromDb = this.jsonUtil.clone(this.databaseServer.getTables().locations);
        const locations: ILocations = {};
        for (const mapName in locationsFromDb)
        {
            const mapBase = locationsFromDb[mapName]?.base;
            if (!mapBase)
            {
                this.logger.debug(`Map: ${mapName} has no base json file, skipping generation`);
                continue;
            }

            // Clear out loot array
            mapBase.Loot = [];
            // Add map base data to dictionary
            locations[mapBase._Id] = mapBase;
        }

        return  {
            locations: locations,
            paths: locationsFromDb.base.paths
        };
    }

    /**
     * Handle client/location/getAirdropLoot
     * Get loot for an airdop container
     * Generates it randomly based on config/airdrop.json values
     * @returns Array of LootItem objects
     */
    public getAirdropLoot(): IAirdropLootResult
    {
        const airdropType = this.chooseAirdropType();

        this.logger.debug(`Chose ${airdropType} for airdrop loot`);

        const airdropConfig = this.getAirdropLootConfigByType(airdropType);

        return {dropType: airdropType, loot: this.lootGenerator.createRandomLoot(airdropConfig)};
    }

    /**
     * Randomly pick a type of airdrop loot using weighted values from config
     * @returns airdrop type value
     */
    protected chooseAirdropType(): AirdropTypeEnum
    {
        const possibleAirdropTypes = this.airdropConfig.airdropTypeWeightings;

        return this.weightedRandomHelper.getWeightedValue(possibleAirdropTypes);
    }

    /**
     * Get the configuration for a specific type of airdrop
     * @param airdropType Type of airdrop to get settings for
     * @returns LootRequest
     */
    protected getAirdropLootConfigByType(airdropType: AirdropTypeEnum): LootRequest
    {
        let lootSettingsByType = this.airdropConfig.loot[airdropType];
        if (!lootSettingsByType)
        {
            this.logger.error(this.localisationService.getText("location-unable_to_find_airdrop_drop_config_of_type", airdropType));
            lootSettingsByType = this.airdropConfig.loot[AirdropTypeEnum.MIXED];
        }

        return {
            presetCount: lootSettingsByType.presetCount,
            itemCount: lootSettingsByType.itemCount,
            weaponCrateCount: lootSettingsByType.weaponCrateCount,
            itemBlacklist: lootSettingsByType.itemBlacklist,
            itemTypeWhitelist: lootSettingsByType.itemTypeWhitelist,
            itemLimits: lootSettingsByType.itemLimits,
            itemStackLimits: lootSettingsByType.itemStackLimits,
            armorLevelWhitelist: lootSettingsByType.armorLevelWhitelist
        };
    }
}