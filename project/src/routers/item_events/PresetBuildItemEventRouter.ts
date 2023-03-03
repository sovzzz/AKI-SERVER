import { inject, injectable } from "tsyringe";

import { PresetBuildCallbacks } from "../../callbacks/PresetBuildCallbacks";
import { HandledRoute, ItemEventRouterDefinition } from "../../di/Router";
import { IPmcData } from "../../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../../models/eft/itemEvent/IItemEventRouterResponse";

@injectable()
export class PresetBuildItemEventRouter extends ItemEventRouterDefinition 
{
    constructor(
        @inject("PresetBuildCallbacks") protected presetBuildCallbacks: PresetBuildCallbacks
    ) 
    {
        super();
    }

    public override getHandledRoutes(): HandledRoute[] 
    {
        return [
            new HandledRoute("SaveBuild", false),
            new HandledRoute("RemoveBuild", false)
        ];
    }

    public override handleItemEvent(url: string, pmcData: IPmcData, body: any, sessionID: string): IItemEventRouterResponse 
    {
        switch (url)
        {
            case "SaveBuild":
                return this.presetBuildCallbacks.saveBuild(pmcData, body, sessionID);
            case "RemoveBuild":
                return this.presetBuildCallbacks.removeBuild(pmcData, body, sessionID);         
        }
    }
}