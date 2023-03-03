import { inject, injectable } from "tsyringe";

import { PresetBuildController } from "../controllers/PresetBuildController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import {
    IPresetBuildActionRequestData
} from "../models/eft/presetBuild/IPresetBuildActionRequestData";
import { WeaponBuild } from "../models/eft/profile/IAkiProfile";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class PresetBuildCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("PresetBuildController") protected presetBuildController: PresetBuildController)
    { }

    public getHandbookUserlist(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<WeaponBuild[]>
    {
        return this.httpResponse.getBody(this.presetBuildController.getUserBuilds(sessionID));
    }

    public saveBuild(pmcData: IPmcData, body: IPresetBuildActionRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.presetBuildController.saveBuild(pmcData, body, sessionID);
    }

    public removeBuild(pmcData: IPmcData, body: IPresetBuildActionRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.presetBuildController.removeBuild(pmcData, body, sessionID);
    }
}