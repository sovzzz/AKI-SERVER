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

    public endOfflineRaid(info: IEndOfflineRaidRequestData, sessionID: string): void
    {       
        const pmcData: IPmcData = this.profileHelper.getPmcProfile(sessionID);
        const extract = info.exitName;

        // clean up cached bots now raid is over
        this.botGenerationCacheService.clearStoredBots();

        if (!this.inraidConfig.carExtracts.includes(extract))
        {
            return;
        }

        if (!(extract in pmcData.CarExtractCounts))
        {
            pmcData.CarExtractCounts[extract] = 0;
        }

        pmcData.CarExtractCounts[extract] += 1;
        const extractCount: number = pmcData.CarExtractCounts[extract];

        const fenceID: string = Traders.FENCE;
        let fenceStanding = Number(pmcData.TradersInfo[fenceID].standing);

        // Not exact replica of Live behaviour
        // Simplified for now, no real reason to do the whole (unconfirmed) extra 0.01 standing per day regeneration mechanic
        const baseGain: number = this.inraidConfig.carExtractBaseStandingGain;
        fenceStanding += Math.max(baseGain / extractCount, 0.01);

        pmcData.TradersInfo[fenceID].standing = Math.min(Math.max(fenceStanding, -7), 15);
        this.traderHelper.lvlUp(fenceID, sessionID);
        pmcData.TradersInfo[fenceID].loyaltyLevel = Math.max(pmcData.TradersInfo[fenceID].loyaltyLevel, 1);

        // clear bot loot cache
        this.botLootCacheService.clearCache();
    }
}