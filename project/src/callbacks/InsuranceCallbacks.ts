import { inject, injectable } from "tsyringe";

import { InsuranceController } from "../controllers/InsuranceController";
import { OnUpdate } from "../di/OnUpdate";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IGetInsuranceCostRequestData } from "../models/eft/insurance/IGetInsuranceCostRequestData";
import {
    IGetInsuranceCostResponseData
} from "../models/eft/insurance/IGetInsuranceCostResponseData";
import { IInsureRequestData } from "../models/eft/insurance/IInsureRequestData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IInsuranceConfig } from "../models/spt/config/IInsuranceConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { InsuranceService } from "../services/InsuranceService";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class InsuranceCallbacks implements OnUpdate
{
    protected insuranceConfig: IInsuranceConfig;
    constructor(
        @inject("InsuranceController") protected insuranceController: InsuranceController,
        @inject("InsuranceService") protected insuranceService: InsuranceService,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.insuranceConfig = this.configServer.getConfig(ConfigTypes.INSURANCE);
    }

    /**
     * Handle client/insurance/items/list/cost
     * @returns IGetInsuranceCostResponseData
     */
    public getInsuranceCost(url: string, info: IGetInsuranceCostRequestData, sessionID: string): IGetBodyResponseData<IGetInsuranceCostResponseData>
    {
        return this.httpResponse.getBody(this.insuranceController.cost(info, sessionID));
    }

    /**
     * Handle Insure
     * @returns IItemEventRouterResponse
     */
    public insure(pmcData: IPmcData, body: IInsureRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.insuranceController.insure(pmcData, body, sessionID);
    }

    public async onUpdate(secondsSinceLastRun: number): Promise<boolean>
    {
        if (secondsSinceLastRun > this.insuranceConfig.runIntervalSeconds)
        {
            this.insuranceController.processReturn();
            return true;
        }

        return false;
    }

    public getRoute(): string
    {
        return "aki-insurance";
    }
}
