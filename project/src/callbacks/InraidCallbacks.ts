import { inject, injectable } from "tsyringe";

import { InraidController } from "../controllers/InraidController";
import { INullResponseData } from "../models/eft/httpResponse/INullResponseData";
import { IRegisterPlayerRequestData } from "../models/eft/inRaid/IRegisterPlayerRequestData";
import { ISaveProgressRequestData } from "../models/eft/inRaid/ISaveProgressRequestData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

/**
 * Handle client requests
 */
@injectable()
export class InraidCallbacks
{
    constructor(
        @inject("InraidController") protected inraidController: InraidController,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil
    )
    { }

    /**
     * Handle client/location/getLocalloot
     * Store active map in profile + applicationContext
     * @param url 
     * @param info register player request
     * @param sessionID Session id
     * @returns Null http response
     */
    public registerPlayer(url: string, info: IRegisterPlayerRequestData, sessionID: string): INullResponseData
    {
        this.inraidController.addPlayer(sessionID, info);
        return this.httpResponse.nullResponse();
    }

    /**
     * Handle raid/profile/save
     * @param url 
     * @param info Save progress request
     * @param sessionID Session id
     * @returns Null http response
     */
    public saveProgress(url: string, info: ISaveProgressRequestData, sessionID: string): INullResponseData
    {
        this.inraidController.savePostRaidProgress(info, sessionID);
        return this.httpResponse.nullResponse();
    }

    /**
     * Handle singleplayer/settings/raid/endstate
     * @returns 
     */
    public getRaidEndState(): string
    {
        return this.httpResponse.noBody(this.inraidController.getInraidConfig().MIAOnRaidEnd);
    }

    /**
     * Handle singleplayer/settings/raid/menu
     * @returns JSON as string
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getRaidMenuSettings(): string
    {
        return this.httpResponse.noBody(this.inraidController.getInraidConfig().raidMenuSettings);
    }

    /**
     * Handle singleplayer/settings/weapon/durability
     * @returns 
     */
    public getWeaponDurability(): string
    {
        return this.httpResponse.noBody(this.inraidController.getInraidConfig().save.durability);
    }

    /**
     * Handle singleplayer/airdrop/config
     * @returns JSON as string
     */
    public getAirdropConfig(): string
    {
        return this.httpResponse.noBody(this.inraidController.getAirdropConfig());
    }
}