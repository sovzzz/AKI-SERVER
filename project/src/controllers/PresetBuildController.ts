import { inject, injectable } from "tsyringe";

import { ItemHelper } from "../helpers/ItemHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import {
    IPresetBuildActionRequestData
} from "../models/eft/presetBuild/IPresetBuildActionRequestData";
import { WeaponBuild } from "../models/eft/profile/IAkiProfile";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { SaveServer } from "../servers/SaveServer";
import { HashUtil } from "../utils/HashUtil";

@injectable()
export class PresetBuildController
{
    constructor(
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("SaveServer") protected saveServer: SaveServer
    )
    { }


    public getUserBuilds(sessionID: string): WeaponBuild[]
    {
        return Object.values(this.saveServer.getProfile(sessionID).weaponbuilds);
    }

    public saveBuild(pmcData: IPmcData, body: IPresetBuildActionRequestData, sessionID: string): IItemEventRouterResponse
    {
        delete body.Action;
        body.id = this.hashUtil.generate();

        const output = this.eventOutputHolder.getOutput(sessionID);
        const savedBuilds = this.saveServer.getProfile(sessionID).weaponbuilds;

        // replace duplicate ID's. The first item is the base item.
        // The root ID and the base item ID need to match.
        body.items = this.itemHelper.replaceIDs(pmcData, body.items);
        body.root = body.items[0]._id;

        savedBuilds[body.name] = body;
        this.saveServer.getProfile(sessionID).weaponbuilds = savedBuilds;

        output.profileChanges[sessionID].builds.push(body);
        return output;
    }

    public removeBuild(pmcData: IPmcData, body: IPresetBuildActionRequestData, sessionID: string): IItemEventRouterResponse
    {
        const savedBuilds = this.saveServer.getProfile(sessionID).weaponbuilds;

        for (const name in savedBuilds)
        {
            if (savedBuilds[name].id === body.id)
            {
                delete savedBuilds[name];
                this.saveServer.getProfile(sessionID).weaponbuilds = savedBuilds;
                break;
            }
        }

        return this.eventOutputHolder.getOutput(sessionID);
    }
}