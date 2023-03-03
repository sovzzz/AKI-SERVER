import { inject, injectable } from "tsyringe";
import { OnLoad } from "../di/OnLoad";
import { OnUpdate } from "../di/OnUpdate";

import { RagfairController } from "../controllers/RagfairController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { INullResponseData } from "../models/eft/httpResponse/INullResponseData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IAddOfferRequestData } from "../models/eft/ragfair/IAddOfferRequestData";
import { IExtendOfferRequestData } from "../models/eft/ragfair/IExtendOfferRequestData";
import { IGetItemPriceResult } from "../models/eft/ragfair/IGetItemPriceResult";
import { IGetMarketPriceRequestData } from "../models/eft/ragfair/IGetMarketPriceRequestData";
import { IGetOffersResult } from "../models/eft/ragfair/IGetOffersResult";
import { IRemoveOfferRequestData } from "../models/eft/ragfair/IRemoveOfferRequestData";
import { ISearchRequestData } from "../models/eft/ragfair/ISearchRequestData";
import { ISendRagfairReportRequestData } from "../models/eft/ragfair/ISendRagfairReportRequestData";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IRagfairConfig } from "../models/spt/config/IRagfairConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { RagfairServer } from "../servers/RagfairServer";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { JsonUtil } from "../utils/JsonUtil";

/**
 * Handle ragfair related callback events
 */
@injectable()
export class RagfairCallbacks implements OnLoad, OnUpdate
{
    protected ragfairConfig: IRagfairConfig;

    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("RagfairServer") protected ragfairServer: RagfairServer,
        @inject("RagfairController") protected ragfairController: RagfairController,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
    }

    public async onLoad(): Promise<void>
    {
        await this.ragfairServer.load();
    }

    public getRoute(): string
    {
        return "aki-ragfair";
    }

    public search(url: string, info: ISearchRequestData, sessionID: string): IGetBodyResponseData<IGetOffersResult>
    {
        return this.httpResponse.getBody(this.ragfairController.getOffers(sessionID, info));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getMarketPrice(url: string, info: IGetMarketPriceRequestData, sessionID: string): IGetBodyResponseData<IGetItemPriceResult>
    {
        return this.httpResponse.getBody(this.ragfairController.getItemMinAvgMaxFleaPriceValues(info));
    }

    public addOffer(pmcData: IPmcData, info: IAddOfferRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.ragfairController.addPlayerOffer(pmcData, info, sessionID);
    }

    public removeOffer(pmcData: IPmcData, info: IRemoveOfferRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.ragfairController.removeOffer(info.offerId, sessionID);
    }

    public extendOffer(pmcData: IPmcData, info: IExtendOfferRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.ragfairController.extendOffer(info, sessionID);
    }

    /**
     * Handle /client/items/prices
     * Called when clicking an item to list on flea
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getFleaPrices(url: string, request: IEmptyRequestData, sessionID: string): IGetBodyResponseData<Record<string, number>>
    {
        return this.httpResponse.getBody(this.ragfairController.getAllFleaPrices());
    }

    public async onUpdate(timeSinceLastRun: number): Promise<boolean>
    {
        if (timeSinceLastRun > this.ragfairConfig.runIntervalSeconds)
        {
            // There is a flag inside this class that only makes it run once.
            this.ragfairServer.addPlayerOffers();
            await this.ragfairServer.update();
            // function below used to be split, merged
            this.ragfairController.update();

            return true;
        }

        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public sendReport(url: string, info: ISendRagfairReportRequestData, sessionID: string): INullResponseData
    {
        return this.httpResponse.nullResponse();
    }

}
