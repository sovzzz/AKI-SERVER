import { inject, injectable } from "tsyringe";

import { ApplicationContext } from "../context/ApplicationContext";
import { ContextVariableType } from "../context/ContextVariableType";
import { ProfileHelper } from "../helpers/ProfileHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { ICreateGroupRequestData } from "../models/eft/match/ICreateGroupRequestData";
import { IEndOfflineRaidRequestData } from "../models/eft/match/IEndOfflineRaidRequestData";
import { IGetGroupStatusRequestData } from "../models/eft/match/IGetGroupStatusRequestData";
import { IGetProfileRequestData } from "../models/eft/match/IGetProfileRequestData";
import {
    IGetRaidConfigurationRequestData
} from "../models/eft/match/IGetRaidConfigurationRequestData";
import { IJoinMatchRequestData } from "../models/eft/match/IJoinMatchRequestData";
import { IJoinMatchResult } from "../models/eft/match/IJoinMatchResult";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { Traders } from "../models/enums/Traders";
import { IBotConfig } from "../models/spt/config/IBotConfig";
import { IInRaidConfig } from "../models/spt/config/IInRaidConfig";
import { IMatchConfig } from "../models/spt/config/IMatchConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { SaveServer } from "../servers/SaveServer";
import { BotGenerationCacheService } from "../services/BotGenerationCacheService";
import { BotLootCacheService } from "../services/BotLootCacheService";
import { MatchLocationService } from "../services/MatchLocationService";
import { ProfileSnapshotService } from "../services/ProfileSnapshotService";

@injectable()
export class MatchController
{
    protected matchConfig: IMatchConfig;
    protected inraidConfig: IInRaidConfig;
    protected botConfig: IBotConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("MatchLocationService") protected matchLocationService: MatchLocationService,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("BotLootCacheService") protected botLootCacheService: BotLootCacheService,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("ProfileSnapshotService") protected profileSnapshotService: ProfileSnapshotService,
        @inject("BotGenerationCacheService") protected botGenerationCacheService: BotGenerationCacheService,
        @inject("ApplicationContext") protected applicationContext: ApplicationContext
    )
    {
        this.matchConfig = this.configServer.getConfig(ConfigTypes.MATCH);
        this.inraidConfig = this.configServer.getConfig(ConfigTypes.IN_RAID);
        this.botConfig = this.configServer.getConfig(ConfigTypes.BOT);
    }

    public getEnabled(): boolean
    {
        return this.matchConfig.enabled;
    }

    public getProfile(info: IGetProfileRequestData): IPmcData[]
    {
        if (info.profileId.includes("pmcAID"))
        {
            return this.profileHelper.getCompleteProfile(info.profileId.replace("pmcAID", "AID"));
        }

        if (info.profileId.includes("scavAID"))
        {
            return this.profileHelper.getCompleteProfile(info.profileId.replace("scavAID", "AID"));
        }

        return [];
    }

    public createGroup(sessionID: string, info: ICreateGroupRequestData): any
    {
        return this.matchLocationService.createGroup(sessionID, info);
    }

    public deleteGroup(info: any): void
    {
        this.matchLocationService.deleteGroup(info);
    }

    public joinMatch(info: IJoinMatchRequestData, sessionID: string): IJoinMatchResult[]
    {
        const match = this.getMatch(info.location);
        const output: IJoinMatchResult[] = [];

        // --- LOOP (DO THIS FOR EVERY PLAYER IN GROUP)
        // get player profile
        const account = this.saveServer.getProfile(sessionID).info;
        const profileID = info.savage
            ? `scav${account.id}`
            : `pmc${account.id}`;

        // get list of players joining into the match
        output.push({
            "profileid": profileID,
            "status": "busy",
            "sid": "",
            "ip": match.ip,
            "port": match.port,
            "version": "live",
            "location": info.location,
            raidMode: "Online",
            "mode": "deathmatch",
            "shortid": match.id,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            additional_info: undefined
        });

        return output;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected getMatch(location: string): any
    {
        return {
            "id": "TEST",
            "ip": "127.0.0.1",
            "port": 9909
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getGroupStatus(info: IGetGroupStatusRequestData): any
    {
        return {
            "players": [],
            "invite": [],
            "group": []
        };
    }

    /**
     * Handle /client/raid/configuration
     * @param request 
     * @param sessionID 
     */
    public startOfflineRaid(request: IGetRaidConfigurationRequestData, sessionID: string): void
    {
        this.applicationContext.addValue(ContextVariableType.RAID_CONFIGURATION, request);

        //TODO: add code to strip PMC of equipment now they've started the raid

        // Set pmcs to difficulty set in pre-raid screen if override in bot config isnt enabled
        if (!this.botConfig.pmc.useDifficultyOverride)
        {
            this.botConfig.pmc.difficulty = this.convertDifficultyDropdownIntoBotDifficulty(request.wavesSettings.botDifficulty);
        }

        // Store the profile as-is for later use on the post-raid exp screen 
        const currentProfile = this.saveServer.getProfile(sessionID);
        this.profileSnapshotService.storeProfileSnapshot(sessionID, currentProfile);
    }

    /**
     * Convert a difficulty value from pre-raid screen to a bot difficulty
     * @param botDifficulty dropdown difficulty value
     * @returns bot difficulty
     */
    protected convertDifficultyDropdownIntoBotDifficulty(botDifficulty: string): string
    {
        // Edge case medium - must be altered
        if (botDifficulty.toLowerCase() === "medium")
        {
            return "normal";
        }

        return botDifficulty;
    }

    public endOfflineRaid(info: IEndOfflineRaidRequestData, sessionId: string): void
    {       
        const pmcData: IPmcData = this.profileHelper.getPmcProfile(sessionId);
        const extractName = info.exitName;

        // clean up cached bots now raid is over
        this.botGenerationCacheService.clearStoredBots();

        // clear bot loot cache
        this.botLootCacheService.clearCache();

        if (this.extractWasViaCar(extractName))
        {
            this.handleCarExtract(extractName, pmcData, sessionId);
        }
    }

    /**
     * Is extract by car
     * @param extractName name of extract
     * @returns true if car extract
     */
    protected extractWasViaCar(extractName: string): boolean
    {
        return this.inraidConfig.carExtracts.includes(extractName);
    }

    /**
     * Handle when a player extracts using a car - Add rep to fence
     * @param extractName name of the extract used
     * @param pmcData Player profile
     * @param sessionId Session id
     */
    protected handleCarExtract(extractName: string, pmcData: IPmcData, sessionId: string): void
    {
        // Ensure key exists for extract
        if (!(extractName in pmcData.CarExtractCounts))
        {
            pmcData.CarExtractCounts[extractName] = 0;
        }

        // Increment extract count value
        pmcData.CarExtractCounts[extractName] += 1;

        const fenceId: string = Traders.FENCE;
        this.updateFenceStandingInProfile(pmcData, fenceId, extractName);
        
        this.traderHelper.lvlUp(fenceId, sessionId);
        pmcData.TradersInfo[fenceId].loyaltyLevel = Math.max(pmcData.TradersInfo[fenceId].loyaltyLevel, 1);
    }

    /**
     * Update players fence trader standing value in profile
     * @param pmcData Player profile
     * @param fenceId Id of fence trader
     * @param extractName Name of extract used 
     */
    protected updateFenceStandingInProfile(pmcData: IPmcData, fenceId: string, extractName: string): void
    {
        let fenceStanding = Number(pmcData.TradersInfo[fenceId].standing);

        // Not exact replica of Live behaviour
        // Simplified for now, no real reason to do the whole (unconfirmed) extra 0.01 standing per day regeneration mechanic
        const baseGain: number = this.inraidConfig.carExtractBaseStandingGain;
        const extractCount: number = pmcData.CarExtractCounts[extractName];

        fenceStanding += Math.max(baseGain / extractCount, 0.01);

        // Ensure fence loyalty level is not above/below the range -7 - 15
        pmcData.TradersInfo[fenceId].standing = Math.min(Math.max(fenceStanding, -7), 15);
    }
}