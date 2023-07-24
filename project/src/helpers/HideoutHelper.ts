import { inject, injectable } from "tsyringe";

import { IPmcData } from "../models/eft/common/IPmcData";
import {
    Common, HideoutArea, IHideoutImprovement, Production, Productive
} from "../models/eft/common/tables/IBotBase";
import { Upd } from "../models/eft/common/tables/IItem";
import { StageBonus } from "../models/eft/hideout/IHideoutArea";
import {
    IHideoutContinuousProductionStartRequestData
} from "../models/eft/hideout/IHideoutContinuousProductionStartRequestData";
import { IHideoutProduction } from "../models/eft/hideout/IHideoutProduction";
import {
    IHideoutSingleProductionStartRequestData
} from "../models/eft/hideout/IHideoutSingleProductionStartRequestData";
import {
    IHideoutTakeProductionRequestData
} from "../models/eft/hideout/IHideoutTakeProductionRequestData";
import { IAddItemRequestData } from "../models/eft/inventory/IAddItemRequestData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { HideoutAreas } from "../models/enums/HideoutAreas";
import { SkillTypes } from "../models/enums/SkillTypes";
import { IHideoutConfig } from "../models/spt/config/IHideoutConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { LocalisationService } from "../services/LocalisationService";
import { PlayerService } from "../services/PlayerService";
import { HashUtil } from "../utils/HashUtil";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { TimeUtil } from "../utils/TimeUtil";
import { InventoryHelper } from "./InventoryHelper";
import { ProfileHelper } from "./ProfileHelper";

@injectable()
export class HideoutHelper
{
    public static bitcoinFarm = "5d5c205bd582a50d042a3c0e";
    public static waterCollector = "5d5589c1f934db045e6c5492";
    public static bitcoin = "59faff1d86f7746c51718c9c";
    public static expeditionaryFuelTank = "5d1b371186f774253763a656";
    public static maxSkillPoint = 5000;

    protected hideoutConfig: IHideoutConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("PlayerService") protected playerService: PlayerService,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.hideoutConfig = this.configServer.getConfig(ConfigTypes.HIDEOUT);
    }

    /**
     * Add production to profiles' Hideout.Production array
     * @param pmcData Profile to add production to
     * @param body Production request
     * @param sessionID Session id
     * @returns client response
     */
    public registerProduction(pmcData: IPmcData, body: IHideoutSingleProductionStartRequestData | IHideoutContinuousProductionStartRequestData, sessionID: string): IItemEventRouterResponse
    {
        const recipe = this.databaseServer.getTables().hideout.production.find(p => p._id === body.recipeId);
        if (!recipe)
        {
            this.logger.error(this.localisationService.getText("hideout-missing_recipe_in_db", body.recipeId));

            return this.httpResponse.appendErrorToOutput(this.eventOutputHolder.getOutput(sessionID));
        }

        const modifiedProductionTime = recipe.productionTime - this.getCraftingSkillProductionTimeReduction(pmcData, recipe.productionTime);

        // @Important: Here we need to be very exact:
        // - normal recipe: Production time value is stored in attribute "productionType" with small "p"
        // - scav case recipe: Production time value is stored in attribute "ProductionType" with capital "P"
        pmcData.Hideout.Production[body.recipeId] = this.initProduction(body.recipeId, modifiedProductionTime);
    }

    /**
     * This convenience function initializes new Production Object
     * with all the constants.
     */
    public initProduction(recipeId: string, productionTime: number): Production
    {
        return {
            Progress: 0,
            inProgress: true,
            RecipeId: recipeId,
            Products: [],
            SkipTime: 0,
            ProductionTime: productionTime,
            StartTimestamp: this.timeUtil.getTimestamp()
        };
    }

    /**
     * Is the provided object a Production type
     * @param productive 
     * @returns 
     */
    public isProductionType(productive: Productive): productive is Production
    {
        return (productive as Production).Progress !== undefined || (productive as Production).RecipeId !== undefined;
    }

    // BALIST0N, I got bad news for you
    // we do need to implement these after all
    // ...
    // with that I mean manual implementation
    // RIP, GL whoever is going to do this
    public applyPlayerUpgradesBonuses(pmcData: IPmcData, bonus: StageBonus): void
    {
        switch (bonus.type)
        {
            case "StashSize":
                // TODO: bonus should only have type/templateId
                for (const item in pmcData.Inventory.items)
                {
                    if (pmcData.Inventory.items[item]._id === pmcData.Inventory.stash)
                    {
                        pmcData.Inventory.items[item]._tpl = bonus.templateId;
                    }
                }
                break;
            case "MaximumEnergyReserve":
                pmcData.Health.Energy.Maximum += 10;
                break;
            case "EnergyRegeneration":
            case "HydrationRegeneration":
            case "HealthRegeneration":
            case "DebuffEndDelay":
            case "QuestMoneyReward":
            case "ExperienceRate":
            case "SkillGroupLevelingBoost":
                this.applySkillXPBoost(pmcData, bonus);
                break;
            case "ScavCooldownTimer":
            case "InsuranceReturnTime":
            case "RagfairCommission":
            case "FuelConsumption":
                // These skill is being applied automatically on the RagfairController, InsuranceController, ProfileController, HideoutController
                // ScavCooldownTimer, InsuranceReturnTime, RagfairCommission, FuelConsumption
                break;
            case "AdditionalSlots":
                // Some of these are also implemented on the HideoutController
                break;
            case "UnlockWeaponModification":
            case "RepairArmorBonus":
            case "RepairWeaponBonus":
            case "UnlockArmorRepair":
            case "UnlockWeaponRepair":
            case "TextBonus":
                // TODO: remove properties, only needs id/icon/type
                break;
        }

        pmcData.Bonuses.push(bonus);
    }

    /**
     * TODO:
     * After looking at the skills there doesnt seem to be a configuration per skill to boost
     * the XP gain PER skill. I THINK you should be able to put the variable "SkillProgress" (just like health has it)
     * and be able to tune the skill gain PER skill, but I havent tested it and Im not sure!
     * @param pmcData 
     * @param bonus 
     */
    protected applySkillXPBoost(pmcData: IPmcData, bonus: StageBonus): void
    {
        const skillGroupType = bonus.skillType;
        if (skillGroupType)
        {
            switch (skillGroupType)
            {
                case "Physical":
                case "Mental":
                case "Combat":
                case "Practical":
                case "Special":
                default:
                    break;
            }
        }
    }

    /**
     * Process a players hideout, update areas that use resources + increment production timers
     * @param sessionID Session id
     */
    public updatePlayerHideout(sessionID: string): void
    {
        const pmcData = this.profileHelper.getPmcProfile(sessionID);
        const hideoutProperties = this.getHideoutProperties(pmcData);

        this.updateAreasWithResources(sessionID, pmcData, hideoutProperties);
        this.updateProductionTimers(pmcData, hideoutProperties);
        pmcData.Hideout.sptUpdateLastRunTimestamp = this.timeUtil.getTimestamp();
    }

    /**
     * Get various properties that will be passed to hideout update-related functions
     * @param pmcData Player profile
     * @returns Properties
     */
    protected getHideoutProperties(pmcData: IPmcData): { btcFarmCGs: number; isGeneratorOn: boolean; waterCollectorHasFilter: boolean; }
    {
        const bitcoinFarm = pmcData.Hideout.Areas.find(x => x.type === HideoutAreas.BITCOIN_FARM);
        const bitcoinCount = bitcoinFarm?.slots.filter(slot => slot.item).length ?? 0; // Get slots with an item property

        const hideoutProperties = {
            btcFarmCGs: bitcoinCount,
            isGeneratorOn: pmcData.Hideout.Areas.find(x => x.type === HideoutAreas.GENERATOR)?.active ?? false,
            waterCollectorHasFilter: this.doesWaterCollectorHaveFilter(pmcData.Hideout.Areas.find(x => x.type === HideoutAreas.WATER_COLLECTOR))
        };

        return hideoutProperties;
    }
    
    /**
     * Update progress timer for water collector
     * @param pmcData profile to update
     * @param productionId id of water collection production to update
     * @param hideoutProperties Hideout properties
     */
    protected updateWaterCollectorProductionTimer(pmcData: IPmcData, productionId: string, hideoutProperties: { btcFarmCGs?: number; isGeneratorOn: boolean; waterCollectorHasFilter: boolean; }): void
    {
        const timeElapsed = this.getTimeElapsedSinceLastServerTick(pmcData, hideoutProperties.isGeneratorOn);
        if (hideoutProperties.waterCollectorHasFilter)
        {
            pmcData.Hideout.Production[productionId].Progress += timeElapsed;
        }
    }

    /**
     * Iterate over productions and update their progress timers
     * @param pmcData Profile to check for productions and update
     * @param hideoutProperties Hideout properties
     */
    protected updateProductionTimers(pmcData: IPmcData, hideoutProperties: { btcFarmCGs: number; isGeneratorOn: boolean; waterCollectorHasFilter: boolean; }): void
    {
        const recipes = this.databaseServer.getTables().hideout.production;

        // Check each production
        for (const prodId in pmcData.Hideout.Production)
        {
            const craft = pmcData.Hideout.Production[prodId];

            // Craft complete, skip processing (Don't skip continious crafts like bitcoin farm)
            if (craft.Progress >= craft.ProductionTime && prodId !== HideoutHelper.bitcoinFarm)
            {
                continue;
            }

            if (craft.sptIsScavCase)
            {
                this.updateScavCaseProductionTimer(pmcData, prodId);

                continue;
            }

            if (prodId === HideoutHelper.waterCollector)
            {
                this.updateWaterCollectorProductionTimer(pmcData, prodId, hideoutProperties);

                continue;
            }

            if (prodId === HideoutHelper.bitcoinFarm)
            {
                pmcData.Hideout.Production[prodId] = this.updateBitcoinFarm(pmcData, hideoutProperties.btcFarmCGs, hideoutProperties.isGeneratorOn);
                continue;
            }

            // Other recipes not covered by above
            const recipe = recipes.find(r => r._id === prodId);
            if (!recipe)
            {
                this.logger.error(this.localisationService.getText("hideout-missing_recipe_for_area", prodId));

                continue;
            }

            this.updateProductionProgress(pmcData, prodId, recipe, hideoutProperties);
        }
    }

    /**
     * Update a productions progress value based on the amount of time that has passed
     * @param pmcData Player profile
     * @param prodId Production id being crafted
     * @param recipe Recipe data being crafted
     * @param hideoutProperties 
     */
    protected updateProductionProgress(pmcData: IPmcData, prodId: string, recipe: IHideoutProduction, hideoutProperties: { btcFarmCGs?: number; isGeneratorOn: boolean; waterCollectorHasFilter?: boolean; }): void
    {
        // Production is complete, no need to do any calculations
        if (this.doesProgressMatchProductionTime(pmcData, prodId))
        {
            return;
        }

        // Get seconds since last hideout update + now
        const timeElapsed = this.getTimeElapsedSinceLastServerTick(pmcData, hideoutProperties.isGeneratorOn);

        // Increment progress by time passed
        const production = pmcData.Hideout.Production[prodId];
        production.Progress += timeElapsed;

        // Limit progress to total production time if progress is over (dont run for continious crafts))
        if (!recipe.continuous)
        {
            // If progress is larger than prod time, return ProductionTime, hard cap the vaue
            production.Progress = Math.min(production.Progress, production.ProductionTime);
        }
    }

    /**
     * Check if a productions progress value matches its corresponding recipes production time value
     * @param pmcData Player profile
     * @param prodId Production id
     * @param recipe Recipe being crafted
     * @returns progress matches productionTime from recipe
     */
    protected doesProgressMatchProductionTime(pmcData: IPmcData, prodId: string): boolean
    {
        return pmcData.Hideout.Production[prodId].Progress === pmcData.Hideout.Production[prodId].ProductionTime;
    }

    /**
     * Update progress timer for scav case
     * @param pmcData Profile to update
     * @param productionId Id of scav case production to update
     */
    protected updateScavCaseProductionTimer(pmcData: IPmcData, productionId: string): void
    {
        const timeElapsed = (this.timeUtil.getTimestamp() - pmcData.Hideout.Production[productionId].StartTimestamp) - pmcData.Hideout.Production[productionId].Progress;
        pmcData.Hideout.Production[productionId].Progress += timeElapsed;
    }

    /**
     * Iterate over hideout areas that use resources (fuel/filters etc) and update associated values
     * @param sessionID Session id
     * @param pmcData Profile to update areas of
     * @param hideoutProperties hideout properties
     */
    protected updateAreasWithResources(sessionID: string, pmcData: IPmcData, hideoutProperties: { btcFarmCGs: number; isGeneratorOn: boolean; waterCollectorHasFilter: boolean; }): void
    {
        for (const area of pmcData.Hideout.Areas)
        {
            switch (area.type)
            {
                case HideoutAreas.GENERATOR:
                    if (hideoutProperties.isGeneratorOn)
                    {
                        this.updateFuel(area, pmcData);
                    }
                    break;
                case HideoutAreas.WATER_COLLECTOR:
                    this.updateWaterCollector(sessionID, pmcData, area, hideoutProperties.isGeneratorOn);
                    break;

                case HideoutAreas.AIR_FILTERING:
                    if (hideoutProperties.isGeneratorOn)
                    {
                        this.updateAirFilters(area, pmcData);
                    }
                    break;
            }
        }
    }

    protected updateWaterCollector(sessionId: string, pmcData: IPmcData, area: HideoutArea, isGeneratorOn: boolean): void
    {
        // Skip water collector when not level 3
        if (area.level !== 3)
        {
            return;
        }

        const prod = pmcData.Hideout.Production[HideoutHelper.waterCollector];
        if (prod && this.isProduction(prod))
        {
            area = this.updateWaterFilters(area, prod, isGeneratorOn, pmcData);
        }
        else
        {
            // continuousProductionStart()
            // seem to not trigger consistently
            const recipe: IHideoutSingleProductionStartRequestData = {
                recipeId: HideoutHelper.waterCollector,
                Action: "HideoutSingleProductionStart",
                items: [],
                timestamp: this.timeUtil.getTimestamp()
            };

            this.registerProduction(pmcData, recipe, sessionId);
        }
    }

    protected doesWaterCollectorHaveFilter(waterCollector: HideoutArea): boolean
    {
        if (waterCollector.level === 3) // can put filters in from L3
        {
            // Has filter in at least one slot
            return waterCollector.slots.some(x => x.item);
        }
        
        // No Filter
        return false;
    }

    protected updateFuel(generatorArea: HideoutArea, pmcData: IPmcData): void
    {
        // 1 resource last 14 min 27 sec, 1/14.45/60 = 0.00115
        // 10-10-2021 From wiki, 1 resource last 12 minutes 38 seconds, 1/12.63333/60 = 0.00131
        let fuelDrainRate = this.databaseServer.getTables().hideout.settings.generatorFuelFlowRate * this.hideoutConfig.runIntervalSeconds;
        // implemented moddable bonus for fuel consumption bonus instead of using solar power variable as before
        const fuelBonus = pmcData.Bonuses.find(b => b.type === "FuelConsumption");
        const fuelBonusPercent = 1.0 - (fuelBonus ? Math.abs(fuelBonus.value) : 0) / 100;
        fuelDrainRate *= fuelBonusPercent;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus = 1.0 - this.getHideoutManagementConsumptionBonus(pmcData);
        fuelDrainRate *= hideoutManagementConsumptionBonus;
        let hasFuelRemaining = false;
        let pointsConsumed = 0;

        for (let i = 0; i < generatorArea.slots.length; i++)
        {
            if (generatorArea.slots[i].item)
            {
                let resourceValue = (generatorArea.slots[i].item[0].upd?.Resource)
                    ? generatorArea.slots[i].item[0].upd.Resource.Value
                    : null;
                if (resourceValue === 0)
                {
                    continue;
                }
                else if (!resourceValue)
                {
                    const fuelItem = HideoutHelper.expeditionaryFuelTank;
                    resourceValue = generatorArea.slots[i].item[0]._tpl === fuelItem
                        ? 60 - fuelDrainRate
                        : 100 - fuelDrainRate;
                    pointsConsumed = fuelDrainRate;
                }
                else
                {
                    pointsConsumed = (generatorArea.slots[i].item[0].upd.Resource.UnitsConsumed || 0) + fuelDrainRate;
                    resourceValue -= fuelDrainRate;
                }

                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    this.playerService.incrementSkillLevel(pmcData, SkillTypes.HIDEOUT_MANAGEMENT, 1);
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    generatorArea.slots[i].item[0].upd = this.getAreaUpdObject(1, resourceValue, pointsConsumed);

                    this.logger.debug(`Generator: ${resourceValue} fuel left in slot ${i + 1}`);
                    hasFuelRemaining = true;

                    break; // Break here to avoid updating all the fuel tanks
                }
                else
                {
                    generatorArea.slots[i].item[0].upd = this.getAreaUpdObject(1, 0, 0);

                    // Update remaining resources to be subtracted
                    fuelDrainRate = Math.abs(resourceValue);
                }
            }
        }

        if (!hasFuelRemaining)
        {
            generatorArea.active = false;
        }
    }

    /**
     * Adjust water filter objects resourceValue or delete when they reach 0 resource
     * @param waterFilterArea water filter area to update
     * @param production production object
     * @param isGeneratorOn is generator enabled
     * @param pmcData Player profile
     * @returns Updated HideoutArea object
     */
    protected updateWaterFilters(waterFilterArea: HideoutArea, production: Production, isGeneratorOn: boolean, pmcData: IPmcData): HideoutArea
    {
        let filterDrainRate = this.getWaterFilterDrainRate(pmcData);
        const productionTime = this.getProductionTimeSeconds(HideoutHelper.waterCollector);
        
        const timeElapsed = this.getTimeElapsedSinceLastServerTick(pmcData, isGeneratorOn);
        
        // Adjust filter drain rate based on elapsed time, handle edge case when craft time has gone on longer than total production time
        filterDrainRate *= timeElapsed > productionTime
            ? (productionTime - production.Progress)
            : timeElapsed;
        
        // Production hasn't completed
        let pointsConsumed = 0;
        if (production.Progress < productionTime)
        {
            // Check all slots that take water filters
            for (let i = 0; i < waterFilterArea.slots.length; i++)
            {
                // Has a water filter installed into slot
                if (waterFilterArea.slots[i].item)
                {
                    let resourceValue = (waterFilterArea.slots[i].item[0].upd?.Resource)
                        ? waterFilterArea.slots[i].item[0].upd.Resource.Value
                        : null;
                    if (!resourceValue)
                    {
                        resourceValue = 100 - filterDrainRate;
                        pointsConsumed = filterDrainRate;
                    }
                    else
                    {
                        pointsConsumed = (waterFilterArea.slots[i].item[0].upd.Resource.UnitsConsumed || 0) + filterDrainRate;
                        resourceValue -= filterDrainRate;
                    }
                    resourceValue = Math.round(resourceValue * 10000) / 10000;
                    pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                    //check unit consumed for increment skill point
                    if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                    {
                        this.playerService.incrementSkillLevel(pmcData, SkillTypes.HIDEOUT_MANAGEMENT, 1);
                        pointsConsumed -= 10;
                    }

                    // Filter has some juice left in it
                    if (resourceValue > 0)
                    {
                        waterFilterArea.slots[i].item[0].upd = this.getAreaUpdObject(1, resourceValue, pointsConsumed);
                        this.logger.debug(`Water filter: ${resourceValue} filter left on slot ${i + 1}`);
                        break; // Break here to avoid updating all filters
                    }

                    // Filter ran out / used up
                    delete waterFilterArea.slots[i].item;
                    // Update remaining resources to be subtracted
                    filterDrainRate = Math.abs(resourceValue);
                }
            }
        }

        return waterFilterArea;
    }

    /**
     * Get the water filter drain rate based on hideout bonues player has
     * @param pmcData Player profile
     * @returns Drain rate
     */
    protected getWaterFilterDrainRate(pmcData: IPmcData): number
    {
        // 100 resources last 8 hrs 20 min, 100/8.33/60/60 = 0.00333
        const filterDrainRate = 0.00333;
        const hideoutManagementConsumptionBonus = 1.0 - this.getHideoutManagementConsumptionBonus(pmcData);

        return filterDrainRate * hideoutManagementConsumptionBonus;
    }

    /**
     * Get the production time in seconds for the desired production
     * @param prodId Id, e.g. Water collector id
     * @returns seconds to produce item
     */
    protected getProductionTimeSeconds(prodId: string): number
    {
        const recipe = this.databaseServer.getTables().hideout.production.find(prod => prod._id === prodId);

        return (recipe.productionTime || 0);
    }

    /**
     * Create a upd object using passed in parameters
     * @param stackCount 
     * @param resourceValue 
     * @param resourceUnitsConsumed 
     * @returns Upd
     */
    protected getAreaUpdObject(stackCount: number, resourceValue: number, resourceUnitsConsumed: number): Upd
    {
        return {
            StackObjectsCount: stackCount,
            Resource: {
                Value: resourceValue,
                UnitsConsumed: resourceUnitsConsumed
            }
        };
    }

    protected updateAirFilters(airFilterArea: HideoutArea, pmcData: IPmcData): void
    {
        // 300 resources last 20 hrs, 300/20/60/60 = 0.00416
        /* 10-10-2021 from WIKI (https://escapefromtarkov.fandom.com/wiki/FP-100_filter_absorber)
            Lasts for 17 hours 38 minutes and 49 seconds (23 hours 31 minutes and 45 seconds with elite hideout management skill),
            300/17.64694/60/60 = 0.004722
        */
        let filterDrainRate = this.databaseServer.getTables().hideout.settings.airFilterUnitFlowRate * this.hideoutConfig.runIntervalSeconds;
        // Hideout management resource consumption bonus:
        const hideoutManagementConsumptionBonus = 1.0 - this.getHideoutManagementConsumptionBonus(pmcData);
        filterDrainRate *= hideoutManagementConsumptionBonus;
        let pointsConsumed = 0;

        for (let i = 0; i < airFilterArea.slots.length; i++)
        {
            if (airFilterArea.slots[i].item)
            {
                let resourceValue = (airFilterArea.slots[i].item[0].upd?.Resource)
                    ? airFilterArea.slots[i].item[0].upd.Resource.Value
                    : null;
                if (!resourceValue)
                {
                    resourceValue = 300 - filterDrainRate;
                    pointsConsumed = filterDrainRate;
                }
                else
                {
                    pointsConsumed = (airFilterArea.slots[i].item[0].upd.Resource.UnitsConsumed || 0) + filterDrainRate;
                    resourceValue -= filterDrainRate;
                }
                resourceValue = Math.round(resourceValue * 10000) / 10000;
                pointsConsumed = Math.round(pointsConsumed * 10000) / 10000;

                //check unit consumed for increment skill point
                if (pmcData && Math.floor(pointsConsumed / 10) >= 1)
                {
                    this.playerService.incrementSkillLevel(pmcData, SkillTypes.HIDEOUT_MANAGEMENT, 1);
                    pointsConsumed -= 10;
                }

                if (resourceValue > 0)
                {
                    airFilterArea.slots[i].item[0].upd = {
                        StackObjectsCount: 1,
                        Resource: {
                            Value: resourceValue,
                            UnitsConsumed: pointsConsumed
                        }
                    };
                    this.logger.debug(`Air filter: ${resourceValue} filter left on slot ${i + 1}`);
                    break; // Break here to avoid updating all filters
                }
                else
                {
                    delete airFilterArea.slots[i].item;
                    // Update remaining resources to be subtracted
                    filterDrainRate = Math.abs(resourceValue);
                }
            }
        }
    }
    
    protected updateBitcoinFarm(pmcData: IPmcData, btcFarmCGs: number, isGeneratorOn: boolean): Production
    {
        const btcProd = pmcData.Hideout.Production[HideoutHelper.bitcoinFarm];
        const bitcoinProdData = this.databaseServer.getTables().hideout.production.find(p => p._id === "5d5c205bd582a50d042a3c0e");
        const coinSlotCount = this.getBTCSlots(pmcData);

        // Full on bitcoins, halt progress
        if (this.isProduction(btcProd) && btcProd.Products.length >= coinSlotCount)
        {
            // Set progress to 0
            btcProd.Progress = 0;

            return btcProd;
        }

        if (this.isProduction(btcProd))
        {
            const timeElapsedSeconds = this.getTimeElapsedSinceLastServerTick(pmcData, isGeneratorOn);
            btcProd.Progress += timeElapsedSeconds;

            // The wiki has a wrong formula!
            // Do not change unless you validate it with the Client code files!
            // This formula was found on the client files:
            // *******************************************************
            /*
                public override int InstalledSuppliesCount
             {
              get
              {
               return this.int_1;
              }
              protected set
              {
               if (this.int_1 === value)
                        {
                            return;
                        }
                        this.int_1 = value;
                        base.Single_0 = ((this.int_1 === 0) ? 0f : (1f + (float)(this.int_1 - 1) * this.float_4));
                    }
                }
            */
            // **********************************************************
            // At the time of writing this comment, this was GClass1667
            // To find it in case of weird results, use DNSpy and look for usages on class AreaData
            // Look for a GClassXXXX that has a method called "InitDetails" and the only parameter is the AreaData
            // That should be the bitcoin farm production. To validate, try to find the snippet below:
            /*
                protected override void InitDetails(AreaData data)
                {
                    base.InitDetails(data);
                    this.gclass1678_1.Type = EDetailsType.Farming;
                }
            */
            // BSG finally fixed their settings, they now get loaded from the settings and used in the client
            const coinCraftTimeSeconds = bitcoinProdData.productionTime / (1 + (btcFarmCGs - 1) * this.databaseServer.getTables().hideout.settings.gpuBoostRate);
            while (btcProd.Progress > coinCraftTimeSeconds)
            {
                if (btcProd.Products.length < coinSlotCount)
                {
                    // Has space to add a coin to production
                    this.addBtcToProduction(btcProd, coinCraftTimeSeconds);
                }
                else
                {
                    btcProd.Progress = 0;
                }
            }

            btcProd.StartTimestamp = this.timeUtil.getTimestamp();

            return btcProd;
        }
        else
        {
            return null;
        }
    }

    /**
     * Add bitcoin object to btc production products array and set progress time
     * @param btcProd Bitcoin production object
     * @param coinCraftTimeSeconds Time to craft a bitcoin
     */
    protected addBtcToProduction(btcProd: Production, coinCraftTimeSeconds: number): void
    {
        btcProd.Products.push({
            _id: this.hashUtil.generate(),
            _tpl: "59faff1d86f7746c51718c9c",
            upd: {
                "StackObjectsCount": 1
            }
        });

        btcProd.Progress -= coinCraftTimeSeconds;
    }

    /**
     * Get number of ticks that have passed since hideout areas were last processed, reduced when generator is off
     * @param pmcData Player profile
     * @param isGeneratorOn Is the generator on for the duration of elapsed time
     * @returns Amount of time elapsed in seconds
     */
    protected getTimeElapsedSinceLastServerTick(pmcData: IPmcData, isGeneratorOn: boolean): number
    {
        // Reduce time elapsed (and progress) when generator is off
        let timeElapsed = this.timeUtil.getTimestamp() - pmcData.Hideout.sptUpdateLastRunTimestamp;
        if (!isGeneratorOn)
        {
            timeElapsed *= this.databaseServer.getTables().hideout.settings.generatorSpeedWithoutFuel;
        }

        return timeElapsed;
    }

    /**
     * Get a count of how many BTC can be gathered by the profile
     * @param pmcData Profile to look up
     * @returns coin slot count
     */
    protected getBTCSlots(pmcData: IPmcData): number
    {
        const bitcoinProduction = this.databaseServer.getTables().hideout.production.find(p => p._id === HideoutHelper.bitcoinFarm);
        const productionSlots = bitcoinProduction?.productionLimitCount || 3;
        const hasManagementSkillSlots = this.hasEliteHideoutManagementSkill(pmcData);
        const managementSlotsCount = this.getBitcoinMinerContainerSlotSize() || 2;

        return productionSlots + (hasManagementSkillSlots ? managementSlotsCount : 0);
    }

    /**
     * Does profile have elite hideout management skill
     * @param pmcData Profile to look at
     * @returns True if profile has skill
     */
    protected hasEliteHideoutManagementSkill(pmcData: IPmcData): boolean
    {
        return this.getHideoutManagementSkill(pmcData)?.Progress >= 5100; // level 51+
    }

    /**
     * Get a count of bitcoins player miner can hold
     */
    protected getBitcoinMinerContainerSlotSize(): number
    {
        return this.databaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.EliteSlots.BitcoinFarm.Container;
    }

    /**
     * Get the hideout management skill from player profile
     * @param pmcData Profile to look at
     * @returns Hideout management skill object
     */
    protected getHideoutManagementSkill(pmcData: IPmcData): Common
    {
        return pmcData.Skills.Common.find(x => x.Id === SkillTypes.HIDEOUT_MANAGEMENT);
    }

    protected getHideoutManagementConsumptionBonus(pmcData: IPmcData): number
    {
        const hideoutManagementSkill = this.getHideoutManagementSkill(pmcData);
        if (!hideoutManagementSkill)
        {
            return 0;
        }
        let roundedLevel = Math.floor(hideoutManagementSkill.Progress / 100);
        // If the level is 51 we need to round it at 50 so on elite you dont get 25.5%
        // at level 1 you already get 0.5%, so it goes up until level 50. For some reason the wiki
        // says that it caps at level 51 with 25% but as per dump data that is incorrect apparently
        roundedLevel = (roundedLevel === 51) ? roundedLevel - 1 : roundedLevel;

        return (roundedLevel * this.databaseServer.getTables().globals.config.SkillsSettings.HideoutManagement.ConsumptionReductionPerLevel) / 100;
    }

    /**
     * Adjust craft time based on crafting skill level found in player profile
     * @param pmcData Player profile
     * @param productionTime Time to complete hideout craft in seconds
     * @returns Adjusted craft time in seconds
     */
    protected getCraftingSkillProductionTimeReduction(pmcData: IPmcData, productionTime: number): number
    {
        const craftingSkill = pmcData.Skills.Common.find(x=> x.Id === SkillTypes.CRAFTING);
        if (!craftingSkill)
        {
            return productionTime;
        }
        const roundedLevel = Math.floor(Math.min(HideoutHelper.maxSkillPoint, craftingSkill.Progress) / 100);
        const percentageToDrop = roundedLevel * 0.75;

        return (productionTime * percentageToDrop) / 100;
    }

    public isProduction(productive: Productive): productive is Production
    {
        return (productive as Production).Progress !== undefined || (productive as Production).RecipeId !== undefined;
    }

    /**
     * Gather crafted BTC from hideout area and add to inventory
     * Reset production start timestamp if hideout area at full coin capacity
     * @param pmcData Player profile
     * @param request Take production request
     * @param sessionId Session id
     * @returns IItemEventRouterResponse
     */
    public getBTC(pmcData: IPmcData, request: IHideoutTakeProductionRequestData, sessionId: string): IItemEventRouterResponse
    {
        const output = this.eventOutputHolder.getOutput(sessionId);

        // Get how many coins were crafted and ready to pick up
        const craftedCoinCount = pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products.length;
        if (!craftedCoinCount)
        {
            const errorMsg = this.localisationService.getText("hideout-no_bitcoins_to_collect");
            this.logger.error(errorMsg);
            
            return this.httpResponse.appendErrorToOutput(output, errorMsg);
        }

        const btcCoinCreationRequest = this.createBitcoinRequest(pmcData);
        const coinSlotCount = this.getBTCSlots(pmcData);

        // Run callback after coins are added to player inventory
        const callback = () =>
        {
            // Is at max capacity
            if (pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products.length >= coinSlotCount)
            {
                // Set start to now
                pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].StartTimestamp = this.timeUtil.getTimestamp();
            }

            // Remove crafted coins from production in profile
            pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products = [];
        };

        // Add FiR coins to player inventory
        return this.inventoryHelper.addItem(pmcData, btcCoinCreationRequest, output, sessionId, callback, true);
    }

    /**
     * Create a single bitcoin request object
     * @param pmcData Player profile
     * @returns IAddItemRequestData
     */
    protected createBitcoinRequest(pmcData: IPmcData): IAddItemRequestData
    {
        return {
            items: [{
                // eslint-disable-next-line @typescript-eslint/naming-convention
                item_id: HideoutHelper.bitcoin,
                count: pmcData.Hideout.Production[HideoutHelper.bitcoinFarm].Products.length
            }],
            tid: "ragfair"
        };
    }

    /**
     * Upgrade hideout wall from starting level to interactable level if enough time has passed
     * @param pmcProfile Profile to upgrade wall in
     */
    public unlockHideoutWallInProfile(pmcProfile: IPmcData): void
    {
        // Sufficient time has passed since account created, upgrade wall to next level to be interactable
        const wallUnlockTimestamp = this.hideoutConfig.hideoutWallAppearTimeSeconds + pmcProfile.Info.RegistrationDate;
        if (wallUnlockTimestamp < this.timeUtil.getTimestamp())
        {
            // Get wall area
            const wall = pmcProfile.Hideout.Areas.find(x => x.type === HideoutAreas.EMERGENCY_WALL);
            if (!wall)
            {
                return;
            }

            if (wall.level === 0)
            {
                wall.level++;
                wall.constructing = true;

                return;
            }

            if (wall.level === 1)
            {
                if (this.hideoutImprovementIsComplete(pmcProfile.Hideout.Improvements["639199277a9178252d38c98f"]))
                {
                    this.logger.debug("Improvement 639199277a9178252d38c98f found, upgrading hideout wall from level: 1 to 3");
                    wall.level = 3;
                    wall.constructing = false;
                    // 0 = no wall | Idle State
                    // 1 - EATS EVERYTHING without areas.json change to include improvements
                    // 2 - Should be Moppable wall / Interactable wall While Constructing = true Sledgehammer is Smashable 
                    // 2 - While false UI is broken. While true mimics level 3 hideout
                    // 3 - Smashable wall / Sledgehammer
                    // 4 - Installable door
                }
                
                return;
            }

            // Workaround for old profiles that have the wall at level 2
            if (wall.level === 2)
            {
                this.logger.debug("Old wall level 2 found, fixing");
                if (this.hideoutImprovementIsComplete(pmcProfile.Hideout.Improvements["639199277a9178252d38c98f"]))
                {
                    this.logger.debug("Wall level adjusted to 3");
                    wall.level++;
                }
                else
                {
                    this.logger.debug("Wall level adjusted to 1");
                    wall.level--;
                }
            }


        }
    }

    /**
     * Hideout improvement is flagged as complete
     * @param improvement hideout improvement object
     * @returns true if complete
     */
    protected hideoutImprovementIsComplete(improvement: IHideoutImprovement): boolean
    {
        return improvement?.completed
            ? true
            : false;
    }

    /**
     * Iterate over hideout improvements not completed and check if they need to be adjusted
     * @param pmcProfile Profile to adjust
     */
    public setHideoutImprovementsToCompleted(pmcProfile: IPmcData): void
    {
        for (const improvementId in pmcProfile.Hideout.Improvements)
        {
            const improvementDetails = pmcProfile.Hideout.Improvements[improvementId];
            if (improvementDetails.completed === false && improvementDetails.improveCompleteTimestamp < this.timeUtil.getTimestamp())
            {
                improvementDetails.completed = true;
            }
        }
    }
}