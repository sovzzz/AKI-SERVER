import { inject, injectable } from "tsyringe";

import { HealthController } from "../controllers/HealthController";
import { ProfileHelper } from "../helpers/ProfileHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IHealthTreatmentRequestData } from "../models/eft/health/IHealthTreatmentRequestData";
import { IOffraidEatRequestData } from "../models/eft/health/IOffraidEatRequestData";
import { IOffraidHealRequestData } from "../models/eft/health/IOffraidHealRequestData";
import { ISyncHealthRequestData } from "../models/eft/health/ISyncHealthRequestData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IWorkoutData } from "../models/eft/health/IWorkoutData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class HealthCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("HealthController") protected healthController: HealthController)
    { }

    /**
     * Custom aki server request found in modules/HealthSynchronizer.cs
     * @param url 
     * @param info HealthListener.Instance.CurrentHealth class
     * @param sessionID session id
     * @returns empty response, no data sent back to client
     */
    public syncHealth(url: string, info: ISyncHealthRequestData, sessionID: string): IGetBodyResponseData<string>
    {
        this.healthController.saveVitality(this.profileHelper.getPmcProfile(sessionID), info, sessionID);
        return this.httpResponse.emptyResponse();
    }

    /**
     * Custom aki server request found in modules/QTEPatch.cs
     * @param url 
     * @param info HealthListener.Instance.CurrentHealth class
     * @param sessionID session id
     * @returns empty response, no data sent back to client
     */
    public handleWorkoutEffects(url: string, info: IWorkoutData, sessionID: string): IGetBodyResponseData<string>
    {
        this.healthController.applyWorkoutChanges(
            this.profileHelper.getPmcProfile(sessionID), info, sessionID
        );
        
        return this.httpResponse.emptyResponse();
    }

    /**
     * Handle Eat
     * @returns IItemEventRouterResponse
     */
    public offraidEat(pmcData: IPmcData, body: IOffraidEatRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.healthController.offraidEat(pmcData, body, sessionID);
    }

    /**
     * Handle Heal
     * @returns IItemEventRouterResponse
     */
    public offraidHeal(pmcData: IPmcData, body: IOffraidHealRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.healthController.offraidHeal(pmcData, body, sessionID);
    }

    /**
     * Handle RestoreHealth
     * @returns IItemEventRouterResponse
     */
    public healthTreatment(pmcData: IPmcData, info: IHealthTreatmentRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.healthController.healthTreatment(pmcData, info, sessionID);
    }
}
