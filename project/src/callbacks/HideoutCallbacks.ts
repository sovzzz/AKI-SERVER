import { inject, injectable } from "tsyringe";

import { HideoutController } from "../controllers/HideoutController";
import { OnUpdate } from "../di/OnUpdate";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IHandleQTEEventRequestData } from "../models/eft/hideout/IHandleQTEEventRequestData";
import {
    IHideoutContinuousProductionStartRequestData
} from "../models/eft/hideout/IHideoutContinuousProductionStartRequestData";
import {
    IHideoutImproveAreaRequestData
} from "../models/eft/hideout/IHideoutImproveAreaRequestData";
import { IHideoutPutItemInRequestData } from "../models/eft/hideout/IHideoutPutItemInRequestData";
import {
    IHideoutScavCaseStartRequestData
} from "../models/eft/hideout/IHideoutScavCaseStartRequestData";
import {
    IHideoutSingleProductionStartRequestData
} from "../models/eft/hideout/IHideoutSingleProductionStartRequestData";
import {
    IHideoutTakeItemOutRequestData
} from "../models/eft/hideout/IHideoutTakeItemOutRequestData";
import {
    IHideoutTakeProductionRequestData
} from "../models/eft/hideout/IHideoutTakeProductionRequestData";
import { IHideoutToggleAreaRequestData } from "../models/eft/hideout/IHideoutToggleAreaRequestData";
import {
    IHideoutUpgradeCompleteRequestData
} from "../models/eft/hideout/IHideoutUpgradeCompleteRequestData";
import { IHideoutUpgradeRequestData } from "../models/eft/hideout/IHideoutUpgradeRequestData";
import { IRecordShootingRangePoints } from "../models/eft/hideout/IRecordShootingRangePoints";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IHideoutConfig } from "../models/spt/config/IHideoutConfig";
import { ConfigServer } from "../servers/ConfigServer";

@injectable()
export class HideoutCallbacks implements OnUpdate
{
    protected hideoutConfig: IHideoutConfig;

    constructor(
        @inject("HideoutController") protected hideoutController: HideoutController, // TODO: delay needed
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.hideoutConfig = this.configServer.getConfig(ConfigTypes.HIDEOUT);
    }

    /**
     * Handle HideoutUpgrade
     */
    public upgrade(pmcData: IPmcData, body: IHideoutUpgradeRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.startUpgrade(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutUpgradeComplete
     */
    public upgradeComplete(pmcData: IPmcData, body: IHideoutUpgradeCompleteRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.upgradeComplete(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutPutItemsInAreaSlots
     */
    public putItemsInAreaSlots(pmcData: IPmcData, body: IHideoutPutItemInRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.putItemsInAreaSlots(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutTakeItemsFromAreaSlots
     */
    public takeItemsFromAreaSlots(pmcData: IPmcData, body: IHideoutTakeItemOutRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.takeItemsFromAreaSlots(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutToggleArea
     */
    public toggleArea(pmcData: IPmcData, body: IHideoutToggleAreaRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.toggleArea(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutSingleProductionStart
     */
    public singleProductionStart(pmcData: IPmcData, body: IHideoutSingleProductionStartRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.singleProductionStart(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutScavCaseProductionStart
     */
    public scavCaseProductionStart(pmcData: IPmcData, body: IHideoutScavCaseStartRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.scavCaseProductionStart(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutContinuousProductionStart
     */
    public continuousProductionStart(pmcData: IPmcData, body: IHideoutContinuousProductionStartRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.continuousProductionStart(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutTakeProduction
     */
    public takeProduction(pmcData: IPmcData, body: IHideoutTakeProductionRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.hideoutController.takeProduction(pmcData, body, sessionID);
    }

    /**
     * Handle HideoutQuickTimeEvent
     */
    public handleQTEEvent(pmcData: IPmcData, request: IHandleQTEEventRequestData, sessionId: string): IItemEventRouterResponse
    {
        return this.hideoutController.handleQTEEventOutcome(sessionId, pmcData, request);
    }

    /**
     * Handle client/game/profile/items/moving - RecordShootingRangePoints
     */
    public recordShootingRangePoints(pmcData: IPmcData, request: IRecordShootingRangePoints, sessionId: string): IItemEventRouterResponse
    {
        return this.hideoutController.recordShootingRangePoints(sessionId, pmcData, request);
    }

    /**
     * Handle client/game/profile/items/moving - RecordShootingRangePoints
     */
    public improveArea(pmcData: IPmcData, request: IHideoutImproveAreaRequestData, sessionId: string): IItemEventRouterResponse
    {
        return this.hideoutController.improveArea(sessionId, pmcData, request);
    }

    public async onUpdate(timeSinceLastRun: number): Promise<boolean>
    {
        if (timeSinceLastRun > this.hideoutConfig.runIntervalSeconds)
        {
            this.hideoutController.update();
            return true;
        }

        return false;
    }

    public getRoute() :string
    {
        return "aki-hideout";
    }
}