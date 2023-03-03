import { inject, injectable } from "tsyringe";

import { QuestHelper } from "../helpers/QuestHelper";
import { RepairHelper } from "../helpers/RepairHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IRepairActionDataRequest } from "../models/eft/repair/IRepairActionDataRequest";
import {
    ITraderRepairActionDataRequest
} from "../models/eft/repair/ITraderRepairActionDataRequest";
import { IRepairConfig } from "../models/spt/config/IRepairConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { DatabaseServer } from "../servers/DatabaseServer";
import { PaymentService } from "../services/PaymentService";
import { RepairService } from "../services/RepairService";

@injectable()
export class RepairController
{
    protected repairConfig: IRepairConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("QuestHelper") protected questHelper: QuestHelper,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("PaymentService") protected paymentService: PaymentService,
        @inject("RepairHelper") protected repairHelper: RepairHelper,
        @inject("RepairService") protected repairService: RepairService
    )
    { }

    /**
     * Repair with trader
     * @param sessionID session id
     * @param body endpoint request data
     * @param pmcData player profile
     * @returns item event router action
     */
    public traderRepair(sessionID: string, body: ITraderRepairActionDataRequest, pmcData: IPmcData): IItemEventRouterResponse
    {
        const output = this.eventOutputHolder.getOutput(sessionID);
        
        // find the item to repair
        for (const repairItem of body.repairItems)
        {
            const repairDetails = this.repairService.repairItemByTrader(sessionID, pmcData, repairItem, body.tid);

            this.repairService.payForRepair(sessionID, pmcData, repairItem._id, repairDetails.repairCost, body.tid, output);

            if (output.warnings.length > 0)
            {
                return output;
            }

            // Add repaired item to output object
            output.profileChanges[sessionID].items.change.push(repairDetails.repairedItem);

            // Add skill points for repairing weapons
            this.repairService.addRepairSkillPoints(sessionID, repairDetails, pmcData);
        }

        return output;
    }

    /**
     * Repair with repair kit
     * @param sessionID session id
     * @param body endpoint request data
     * @param pmcData player profile
     * @returns item event router action
     */
    public repairWithKit(sessionID: string, body: IRepairActionDataRequest, pmcData: IPmcData): IItemEventRouterResponse
    {
        const output = this.eventOutputHolder.getOutput(sessionID);

        // repair item
        const repairDetails = this.repairService.repairItemByKit(sessionID, pmcData, body.repairKitsInfo, body.target, output);

        this.repairService.addBuffToItem(repairDetails, pmcData);

        // add repaired item to send to client
        output.profileChanges[sessionID].items.change.push(repairDetails.repairedItem);

        // Add skill points for repairing weapons
        this.repairService.addRepairSkillPoints(sessionID, repairDetails, pmcData);

        return output;
    }
}