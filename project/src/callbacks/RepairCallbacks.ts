import { inject, injectable } from "tsyringe";

import { RepairController } from "../controllers/RepairController";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IRepairActionDataRequest } from "../models/eft/repair/IRepairActionDataRequest";
import {
    ITraderRepairActionDataRequest
} from "../models/eft/repair/ITraderRepairActionDataRequest";

@injectable()
export class RepairCallbacks
{
    constructor(
        @inject("RepairController") protected repairController: RepairController)
    { }

    /**
     * use trader to repair item
     * @param pmcData 
     * @param body 
     * @param sessionID 
     * @returns 
     */
    public traderRepair(pmcData: IPmcData, body: ITraderRepairActionDataRequest, sessionID: string): IItemEventRouterResponse
    {
        return this.repairController.traderRepair(sessionID, body, pmcData);
    }

    /**
     * Use repair kit to repair item
     * @param pmcData 
     * @param body 
     * @param sessionID 
     * @returns 
     */
    public repair(pmcData: IPmcData, body: IRepairActionDataRequest, sessionID: string): IItemEventRouterResponse
    {
        return this.repairController.repairWithKit(sessionID, body, pmcData);
    }
}