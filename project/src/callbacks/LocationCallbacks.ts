import { inject, injectable } from "tsyringe";

import { LocationController } from "../controllers/LocationController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { ILocationBase } from "../models/eft/common/ILocationBase";
import {
    ILocationsGenerateAllResponse
} from "../models/eft/common/ILocationsSourceDestinationBase";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IGetLocationRequestData } from "../models/eft/location/IGetLocationRequestData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class LocationCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("LocationController") protected locationController: LocationController
    )
    { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getLocationData(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<ILocationsGenerateAllResponse>
    {
        return this.httpResponse.getBody(this.locationController.generateAll());
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getLocation(url: string, info: IGetLocationRequestData, sessionID: string): IGetBodyResponseData<ILocationBase>
    {
        return this.httpResponse.getBody(this.locationController.get(info.locationId));
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getAirdropLoot(url: string, info: IEmptyRequestData, sessionID: string): string
    {
        return this.httpResponse.noBody(this.locationController.getAirdropLoot());
    }
}
