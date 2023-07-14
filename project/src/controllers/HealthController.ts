import { inject, injectable } from "tsyringe";

import { HealthHelper } from "../helpers/HealthHelper";
import { InventoryHelper } from "../helpers/InventoryHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import {
    BodyPart, IHealthTreatmentRequestData
} from "../models/eft/health/IHealthTreatmentRequestData";
import { IOffraidEatRequestData } from "../models/eft/health/IOffraidEatRequestData";
import { IOffraidHealRequestData } from "../models/eft/health/IOffraidHealRequestData";
import { ISyncHealthRequestData } from "../models/eft/health/ISyncHealthRequestData";
import { IWorkoutData } from "../models/eft/health/IWorkoutData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBuyTradeRequestData } from "../models/eft/trade/IProcessBuyTradeRequestData";
import { Traders } from "../models/enums/Traders";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { LocalisationService } from "../services/LocalisationService";
import { PaymentService } from "../services/PaymentService";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { JsonUtil } from "../utils/JsonUtil";

@injectable()
export class HealthController
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PaymentService") protected paymentService: PaymentService,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("HealthHelper") protected healthHelper: HealthHelper
    )
    {}

    /**
     * stores in-raid player health
     * @param pmcData Player profile
     * @param info Request data
     * @param sessionID 
     * @param addEffects Should effects found be added or removed from profile
     */
    public saveVitality(pmcData: IPmcData, info: ISyncHealthRequestData, sessionID: string, addEffects = true, deleteExistingEffects = true): void
    {
        this.healthHelper.saveVitality(pmcData, info, sessionID, addEffects, deleteExistingEffects);
    }

    /**
     * When healing in menu
     * @param pmcData 
     * @param body 
     * @param sessionID 
     * @returns 
     */
    public offraidHeal(pmcData: IPmcData, body: IOffraidHealRequestData, sessionID: string): IItemEventRouterResponse
    {
        const output = this.eventOutputHolder.getOutput(sessionID);

        // update medkit used (hpresource)
        const inventoryItem = pmcData.Inventory.items.find(item => item._id === body.item);
        if (!inventoryItem)
        {
            this.logger.error(this.localisationService.getText("health-healing_item_not_found", inventoryItem._id));

            // For now we just return nothing
            return;
        }

        if (!("upd" in inventoryItem))
        {
            inventoryItem.upd = {};
        }

        if ("MedKit" in inventoryItem.upd)
        {
            inventoryItem.upd.MedKit.HpResource -= body.count;
        }
        else
        {
            const maxhp = this.itemHelper.getItem(inventoryItem._tpl)[1]._props.MaxHpResource;
            inventoryItem.upd.MedKit = { "HpResource": maxhp - body.count };
        }

        if (inventoryItem.upd.MedKit.HpResource <= 0)
        {
            this.inventoryHelper.removeItem(pmcData, body.item, sessionID, output);
        }

        return output;
    }

    /**
     * Handle Eat event
     * Consume food/water outside of a raid
     * @param pmcData Player profile
     * @param body request Object
     * @param sessionID Session id
     * @returns IItemEventRouterResponse
     */
    public offraidEat(pmcData: IPmcData, body: IOffraidEatRequestData, sessionID: string): IItemEventRouterResponse
    {
        let output = this.eventOutputHolder.getOutput(sessionID);
        let resourceLeft = 0;
        let consumedItemMaxResource = 0;

        const itemToConsume = pmcData.Inventory.items.find(x => x._id === body.item);
        if (!itemToConsume)
        {
            // Item not found, very bad
            return this.httpResponse.appendErrorToOutput(output, this.localisationService.getText("health-unable_to_find_item_to_consume", body.item));
        }

        consumedItemMaxResource = this.itemHelper.getItem(itemToConsume._tpl)[1]._props.MaxResource;
        if (consumedItemMaxResource > 1)
        {
            if (itemToConsume.upd.FoodDrink === undefined)
            {
                itemToConsume.upd.FoodDrink = {
                    "HpPercent": consumedItemMaxResource - body.count };
            }
            else
            {
                itemToConsume.upd.FoodDrink.HpPercent -= body.count;
            }

            resourceLeft = itemToConsume.upd.FoodDrink.HpPercent;
        }

        // Remove item from inventory if resource has dropped below threshold
        if (consumedItemMaxResource === 1 || resourceLeft < 1)
        {
            output = this.inventoryHelper.removeItem(pmcData, body.item, sessionID, output);
        }

        return output;
    }
    
    /**
     * Handle RestoreHealth event
     * Occurs on post-raid healing page
     * @param pmcData player profile
     * @param healthTreatmentRequest Request data from client
     * @param sessionID Session id
     * @returns 
     */
    public healthTreatment(pmcData: IPmcData, healthTreatmentRequest: IHealthTreatmentRequestData, sessionID: string): IItemEventRouterResponse
    {
        let output = this.eventOutputHolder.getOutput(sessionID);
        const payMoneyRequest: IProcessBuyTradeRequestData = {
            Action: healthTreatmentRequest.Action,
            tid: Traders.THERAPIST,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            scheme_items: healthTreatmentRequest.items,
            type: "",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            item_id: "",
            count: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            scheme_id: 0
        };

        output = this.paymentService.payMoney(pmcData, payMoneyRequest, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        const bodyPartsRequest = healthTreatmentRequest.difference.BodyParts;
        const healthRequest: ISyncHealthRequestData = {
            IsAlive: true,
            Health: {}
        };

        // Iterate over body parts in health Treatment request and add health values + effects to above health request object
        for (const bodyPartKey in bodyPartsRequest)
        {
            const bodyPart: BodyPart = healthTreatmentRequest.difference.BodyParts[bodyPartKey];

            healthRequest.Health[bodyPartKey] = {};
            healthRequest.Health[bodyPartKey].Current = Math.round(pmcData.Health.BodyParts[bodyPartKey].Health.Current + bodyPart.Health);

            // Check for effects that have been removed as part of therapist treatment
            if ("Effects" in bodyPart && bodyPart.Effects)
            {
                // Iterate over effects array and add as properties to dict
                for (const effect of bodyPart.Effects)
                {
                    if (!healthRequest.Health[bodyPartKey].Effects)
                    {
                        healthRequest.Health[bodyPartKey].Effects = {};
                    }

                    healthRequest.Health[bodyPartKey].Effects[effect] = -1;
                }
            }
        }

        healthRequest.Hydration = pmcData.Health.Hydration.Current + healthTreatmentRequest.difference.Hydration;
        healthRequest.Energy = pmcData.Health.Energy.Current + healthTreatmentRequest.difference.Energy;
        healthRequest.Temperature = pmcData.Health.Temperature.Current;

        // Update health values, persist effects on limbs
        this.saveVitality(pmcData, healthRequest, sessionID, true, false);

        // Remove effects on limbs that were treated
        this.removeEffectsAfterPostRaidHeal(sessionID, pmcData, healthTreatmentRequest, output);

        return output;
    }

    /**
     * applies skills from hideout workout.
     * @param pmcData Player profile
     * @param info Request data
     * @param sessionID 
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public applyWorkoutChanges(pmcData: IPmcData, info: IWorkoutData, sessionId: string): void
    {
        // https://dev.sp-tarkov.com/SPT-AKI/Server/issues/2674
        // TODO:
        // Health effects (fractures etc) are handled in /player/health/sync.
        pmcData.Skills.Common = info.skills.Common;
    }

    /**
     * Iterate over treatment request diff and find effects to remove from player limbs
     * @param sessionId 
     * @param profile Profile to update
     * @param treatmentRequest client request
     * @param output response to send to client
     */
    protected removeEffectsAfterPostRaidHeal(sessionId: string, profile: IPmcData, treatmentRequest: IHealthTreatmentRequestData, output: IItemEventRouterResponse): void
    {
        // Get body parts with effects we should remove from treatment object
        const bodyPartsWithEffectsToRemove = {};
        for (const partId in treatmentRequest.difference.BodyParts)
        {
            const effects = treatmentRequest.difference.BodyParts[partId].Effects;
            if (effects && effects.length > 0)
            {
                bodyPartsWithEffectsToRemove[partId] = treatmentRequest.difference.BodyParts[partId];
            }
        }

        // Iterate over body parts with effects to remove
        for (const bodyPartId in bodyPartsWithEffectsToRemove)
        {
            // Get effects to remove
            const effectsToRemove = bodyPartsWithEffectsToRemove[bodyPartId].Effects;
            const profileBodyPartEffects = profile.Health.BodyParts[bodyPartId].Effects;
            if (profileBodyPartEffects)
            {
                // Profile bodypart has effects
                for (const effectToRemove of effectsToRemove)
                {
                    // Remove effect from profile
                    delete profileBodyPartEffects[effectToRemove];
                }
            }
        }

        // Inform client of new post-raid, post-therapist heal values
        output.profileChanges[sessionId].health = this.jsonUtil.clone(profile.Health);
    }
}