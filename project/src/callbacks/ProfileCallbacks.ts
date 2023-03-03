import { inject, injectable } from "tsyringe";

import { ProfileController } from "../controllers/ProfileController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { INullResponseData } from "../models/eft/httpResponse/INullResponseData";
import { IGetMiniProfileRequestData } from "../models/eft/launcher/IGetMiniProfileRequestData";
import { GetProfileStatusResponseData } from "../models/eft/profile/GetProfileStatusResponseData";
import { IGetProfileSettingsRequest } from "../models/eft/profile/IGetProfileSettingsRequest";
import {
    IProfileChangeNicknameRequestData
} from "../models/eft/profile/IProfileChangeNicknameRequestData";
import {
    IProfileChangeVoiceRequestData
} from "../models/eft/profile/IProfileChangeVoiceRequestData";
import { IProfileCreateRequestData } from "../models/eft/profile/IProfileCreateRequestData";
import { ISearchFriendRequestData } from "../models/eft/profile/ISearchFriendRequestData";
import { ISearchFriendResponse } from "../models/eft/profile/ISearchFriendResponse";
import { IValidateNicknameRequestData } from "../models/eft/profile/IValidateNicknameRequestData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { TimeUtil } from "../utils/TimeUtil";

/** Handle profile related client events */
@injectable()
export class ProfileCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("ProfileController") protected profileController: ProfileController)
    { }

    public createProfile(url: string, info: IProfileCreateRequestData, sessionID: string): IGetBodyResponseData<any>
    {
        this.profileController.createProfile(info, sessionID);
        return this.httpResponse.getBody({ uid: `pmc${sessionID}` });
    }

    /**
     * Get the complete player profile (scav + pmc character)
     * @param url 
     * @param info Empty
     * @param sessionID Session id
     * @returns Profile object
     */
    public getProfileData(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<IPmcData[]>
    {
        return this.httpResponse.getBody(this.profileController.getCompleteProfile(sessionID));
    }

    /**
     * Handle the creation of a scav profile for player
     * Occurs post-raid and when profile first created immediately after character details are confirmed by player
     * @param url 
     * @param info empty
     * @param sessionID Session id
     * @returns Profile object
     */
    public regenerateScav(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<IPmcData[]>
    {
        return this.httpResponse.getBody([this.profileController.generatePlayerScav(sessionID)]);
    }

    /**
     * Handle client/game/profile/voice/change event
     * @param url 
     * @param info Change voice request object
     * @param sessionID Session id
     * @returns Client response
     */
    public changeVoice(url: string, info: IProfileChangeVoiceRequestData, sessionID: string): INullResponseData
    {
        this.profileController.changeVoice(info, sessionID);
        return this.httpResponse.nullResponse();
    }

    /**
     * Handle client/game/profile/nickname/change event
     * Client allows player to adjust their profile name
     * @param url 
     * @param info Change nickname request object
     * @param sessionID Session id
     * @returns client response
     */
    public changeNickname(url: string, info: IProfileChangeNicknameRequestData, sessionID: string): IGetBodyResponseData<any>
    {
        const output = this.profileController.changeNickname(info, sessionID);

        if (output === "taken")
        {
            return this.httpResponse.getBody(null, 255, "The nickname is already in use");
        }

        if (output === "tooshort")
        {
            return this.httpResponse.getBody(null, 1, "The nickname is too short");
        }

        return this.httpResponse.getBody({
            status: 0,
            nicknamechangedate: this.timeUtil.getTimestamp()
        });
    }

    public validateNickname(url: string, info: IValidateNicknameRequestData, sessionID: string): IGetBodyResponseData<any>
    {
        const output = this.profileController.validateNickname(info, sessionID);

        if (output === "taken")
        {
            return this.httpResponse.getBody(null, 255, "The nickname is already in use");
        }

        if (output === "tooshort")
        {
            return this.httpResponse.getBody(null, 256, "The nickname is too short");
        }

        return this.httpResponse.getBody({ "status": "ok" });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getReservedNickname(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<string>
    {
        return this.httpResponse.getBody("SPTarkov");
    }

    /**
     * Called when creating a character when choosing a character face/voice
     * @param url 
     * @param info response (empty)
     * @param sessionID 
     * @returns 
     */
    public getProfileStatus(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<GetProfileStatusResponseData>
    {
        const response: GetProfileStatusResponseData = {
            maxPveCountExceeded: false,
            profiles: [
                {
                    "profileid": `scav${sessionID}`,
                    profileToken: null,
                    "status": "Free",
                    "sid": "",
                    "ip": "",
                    "port": 0,
                    version: "live",
                    location: "bigmap",
                    raidMode: "Online",
                    mode: "deathmatch",
                    shortId: "xxx1x1"

                },
                {
                    "profileid": `pmc${sessionID}`,
                    profileToken: null,
                    "status": "Free",
                    "sid": "",
                    "ip": "",
                    "port": 0
                }
            ]
        };

        return this.httpResponse.getBody(response);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getProfileSettings(url: string, info: IGetProfileSettingsRequest, sessionId: string): IGetBodyResponseData<string>
    {
        return this.httpResponse.emptyResponse();
    }

    public searchFriend(url: string, info: ISearchFriendRequestData, sessionID: string): IGetBodyResponseData<ISearchFriendResponse[]>
    {
        return this.httpResponse.getBody(this.profileController.getFriends(info, sessionID));
    }

    public getMiniProfile(url: string, info: IGetMiniProfileRequestData, sessionID: string): string
    {
        return this.httpResponse.noBody(this.profileController.getMiniProfile(sessionID));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getAllMiniProfiles(url: string, info: any, sessionID: string): string
    {
        return this.httpResponse.noBody(this.profileController.getMiniProfiles());
    }
}
