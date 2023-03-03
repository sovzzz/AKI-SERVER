import { inject, injectable } from "tsyringe";

import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { Warning } from "../models/eft/itemEvent/IItemEventRouterBase";
import { IItemEventRouterRequest } from "../models/eft/itemEvent/IItemEventRouterRequest";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { BackendErrorCodes } from "../models/enums/BackendErrorCodes";
import { ItemEventRouter } from "../routers/ItemEventRouter";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class ItemEventCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("ItemEventRouter") protected itemEventRouter: ItemEventRouter
    )
    { }

    public handleEvents(url: string, info: IItemEventRouterRequest, sessionID: string): IGetBodyResponseData<IItemEventRouterResponse>
    {
        const eventResponse = this.itemEventRouter.handleEvents(info, sessionID);
        const result = (eventResponse.warnings.length > 0)
            ? this.httpResponse.getBody(eventResponse, this.getErrorCode(eventResponse.warnings), eventResponse.warnings[0].errmsg) // TODO: map 228 to its enum value
            : this.httpResponse.getBody(eventResponse);

        return result;
    }

    protected getErrorCode(warnings: Warning[]): number
    {
        if (warnings[0]?.code)
        {
            return Number(warnings[0].code);
        }

        return BackendErrorCodes.UNKNOWN_ERROR;
    }
}