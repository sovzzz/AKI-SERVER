import { inject, injectable } from "tsyringe";

import { PlayerScavGenerator } from "../generators/PlayerScavGenerator";
import { DialogueHelper } from "../helpers/DialogueHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { ProfileHelper } from "../helpers/ProfileHelper";
import { QuestHelper } from "../helpers/QuestHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { TemplateSide } from "../models/eft/common/tables/IProfileTemplate";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IMiniProfile } from "../models/eft/launcher/IMiniProfile";
import { IAkiProfile, Inraid, Vitality } from "../models/eft/profile/IAkiProfile";
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
import { MessageType } from "../models/enums/MessageType";
import { QuestStatus } from "../models/enums/QuestStatus";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { DatabaseServer } from "../servers/DatabaseServer";
import { SaveServer } from "../servers/SaveServer";
import { LocalisationService } from "../services/LocalisationService";
import { MailSendService } from "../services/MailSendService";
import { ProfileFixerService } from "../services/ProfileFixerService";
import { HashUtil } from "../utils/HashUtil";
import { TimeUtil } from "../utils/TimeUtil";

@injectable()
export class ProfileController
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("ProfileFixerService") protected profileFixerService: ProfileFixerService,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("MailSendService") protected mailSendService: MailSendService,
        @inject("PlayerScavGenerator") protected playerScavGenerator: PlayerScavGenerator,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("DialogueHelper") protected dialogueHelper: DialogueHelper,
        @inject("QuestHelper") protected questHelper: QuestHelper,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper
    )
    { }

    /**
     * Handle /launcher/profiles
     */
    public getMiniProfiles(): IMiniProfile[]
    {
        const miniProfiles: IMiniProfile[] = [];

        for (const sessionIdKey in this.saveServer.getProfiles())
        {
            miniProfiles.push(this.getMiniProfile(sessionIdKey));
        }

        return miniProfiles;
    }

    /**
     * Handle launcher/profile/info
     */
    public getMiniProfile(sessionID: string): any
    {
        const maxlvl = this.profileHelper.getMaxLevel();
        const profile = this.saveServer.getProfile(sessionID);
        const pmc = profile.characters.pmc;

        // make sure character completed creation
        if (!(("Info" in pmc) && ("Level" in pmc.Info)))
        {
            return {
                "username": profile.info.username,
                "nickname": "unknown",
                "side": "unknown",
                "currlvl": 0,
                "currexp": 0,
                "prevexp": 0,
                "nextlvl": 0,
                "maxlvl": maxlvl,
                "akiData": this.profileHelper.getDefaultAkiDataObject()
            };
        }

        const currlvl = pmc.Info.Level;
        const nextlvl = this.profileHelper.getExperience(currlvl + 1);
        const result = {
            "username": profile.info.username,
            "nickname": pmc.Info.Nickname,
            "side": pmc.Info.Side,
            "currlvl": pmc.Info.Level,
            "currexp": pmc.Info.Experience,
            "prevexp": (currlvl === 0) ? 0 : this.profileHelper.getExperience(currlvl),
            "nextlvl": nextlvl,
            "maxlvl": maxlvl,
            "akiData": profile.aki
        };

        return result;
    }

    /**
     * Handle client/game/profile/list
     */
    public getCompleteProfile(sessionID: string): IPmcData[]
    {
        return this.profileHelper.getCompleteProfile(sessionID);
    }

    /**
     * Handle client/game/profile/create
     */
    public createProfile(info: IProfileCreateRequestData, sessionID: string): void
    {
        const account = this.saveServer.getProfile(sessionID).info;
        const profile: TemplateSide = this.databaseServer.getTables().templates.profiles[account.edition][info.side.toLowerCase()];
        const pmcData = profile.character;

        // Delete existing profile
        this.deleteProfileBySessionId(sessionID);

        // PMC
        pmcData._id = `pmc${sessionID}`;
        pmcData.aid = sessionID;
        pmcData.savage = `scav${sessionID}`;
        pmcData.Info.Nickname = info.nickname;
        pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        pmcData.Info.RegistrationDate = this.timeUtil.getTimestamp();
        pmcData.Info.Voice = this.databaseServer.getTables().templates.customization[info.voiceId]._name;
        pmcData.Stats = this.profileHelper.getDefaultCounters();
        pmcData.Customization.Head = info.headId;
        pmcData.Health.UpdateTime = this.timeUtil.getTimestamp();
        pmcData.Quests = [];
        pmcData.RepeatableQuests = [];
        pmcData.CarExtractCounts = {};

        // change item id's to be unique
        pmcData.Inventory.items = this.itemHelper.replaceIDs(pmcData, pmcData.Inventory.items, null, pmcData.Inventory.fastPanel);

        // Create profile
        const profileDetails: IAkiProfile = {
            info: account,
            characters: {
                pmc: pmcData,
                scav: {} as IPmcData
            },
            suits: profile.suits,
            weaponbuilds: profile.weaponbuilds,
            dialogues: profile.dialogues,
            aki: this.profileHelper.getDefaultAkiDataObject(),
            vitality: {} as Vitality,
            inraid: {} as Inraid,
            insurance: [],
            traderPurchases: {}
        };

        this.profileFixerService.checkForAndFixPmcProfileIssues(profileDetails.characters.pmc);
        this.profileFixerService.addMissingHideoutBonusesToProfile(profileDetails.characters.pmc);

        this.saveServer.addProfile(profileDetails);

        if (profile.trader.setQuestsAvailableForStart)
        {
            this.questHelper.addAllQuestsToProfile(profileDetails.characters.pmc, [QuestStatus.AvailableForStart]);
        }

        // Profile is flagged as wanting quests set to ready to hand in and collect rewards
        if (profile.trader.setQuestsAvailableForFinish)
        {
            this.questHelper.addAllQuestsToProfile(profileDetails.characters.pmc, [QuestStatus.AvailableForFinish]);

            // Make unused response so applyQuestReward works
            const response = this.eventOutputHolder.getOutput(sessionID);

            // Add rewards for starting quests to profile
            this.givePlayerStartingQuestRewards(profileDetails, sessionID, response);
        }

        this.saveServer.getProfile(sessionID).characters.scav = this.generatePlayerScav(sessionID);

        this.resetAllTradersInProfile(sessionID);

        // Store minimal profile and reload it
        this.saveServer.saveProfile(sessionID);
        this.saveServer.loadProfile(sessionID);

        // Completed account creation
        this.saveServer.getProfile(sessionID).info.wipe = false;
        this.saveServer.saveProfile(sessionID);
    }

    /**
     * Delete a profile
     * @param sessionID Id of profile to delete
     */
    protected deleteProfileBySessionId(sessionID: string): void
    {
        if (sessionID in this.saveServer.getProfiles())
        {
            this.saveServer.deleteProfileById(sessionID);
        }
        else
        {
            this.logger.warning(this.localisationService.getText("profile-unable_to_find_profile_by_id_cannot_delete", sessionID));
        }
    }

    /**
     * Iterate over all quests in player profile, inspect rewards for the quests current state (accepted/completed)
     * and send rewards to them in mail
     * @param profileDetails Player profile
     * @param sessionID Session id
     * @param response Event router response
     */
    protected givePlayerStartingQuestRewards(profileDetails: IAkiProfile, sessionID: string, response: IItemEventRouterResponse): void 
    {
        for (const quest of profileDetails.characters.pmc.Quests) 
        {
            const questFromDb = this.questHelper.getQuestFromDb(quest.qid, profileDetails.characters.pmc);

            // Get messageId of text to send to player as text message in game
            // Copy of code from QuestController.acceptQuest()
            const messageId = this.questHelper.getMessageIdForQuestStart(questFromDb.startedMessageText, questFromDb.description);
            const itemRewards = this.questHelper.applyQuestReward(profileDetails.characters.pmc, quest.qid, QuestStatus.Started, sessionID, response);

            this.mailSendService.sendLocalisedNpcMessageToPlayer(
                sessionID,
                this.traderHelper.getTraderById(questFromDb.traderId),
                MessageType.QUEST_START,
                messageId,
                itemRewards,
                this.timeUtil.getHoursAsSeconds(100));
        }
    }

    /**
     * For each trader reset their state to what a level 1 player would see
     * @param sessionID Session id of profile to reset
     */
    protected resetAllTradersInProfile(sessionID: string): void
    {
        for (const traderID in this.databaseServer.getTables().traders)
        {
            this.traderHelper.resetTrader(sessionID, traderID);
        }
    }

    /**
     * Generate a player scav object
     * PMC profile MUST exist first before pscav can be generated
     * @param sessionID 
     * @returns IPmcData object
     */
    public generatePlayerScav(sessionID: string): IPmcData
    {
        return this.playerScavGenerator.generate(sessionID);
    }

    /**
     * Handle client/game/profile/nickname/validate
     */
    public validateNickname(info: IValidateNicknameRequestData, sessionID: string): string
    {
        if (info.nickname.length < 3)
        {
            return "tooshort";
        }

        if (this.profileHelper.isNicknameTaken(info, sessionID))
        {
            return "taken";
        }

        return "OK";
    }

    /**
     * Handle client/game/profile/nickname/change event
     * Client allows player to adjust their profile name
     */
    public changeNickname(info: IProfileChangeNicknameRequestData, sessionID: string): string
    {
        const output = this.validateNickname(info, sessionID);

        if (output === "OK")
        {
            const pmcData = this.profileHelper.getPmcProfile(sessionID);

            pmcData.Info.Nickname = info.nickname;
            pmcData.Info.LowerNickname = info.nickname.toLowerCase();
        }

        return output;
    }

    /**
     * Handle client/game/profile/voice/change event
     */
    public changeVoice(info: IProfileChangeVoiceRequestData, sessionID: string): void
    {
        const pmcData = this.profileHelper.getPmcProfile(sessionID);
        pmcData.Info.Voice = info.voice;
    }

    /**
     * Handle client/game/profile/search
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getFriends(info: ISearchFriendRequestData, sessionID: string): ISearchFriendResponse[]
    {
        return [
            {
                _id: this.hashUtil.generate(),
                Info: {
                    Level: 1,
                    Side: "Bear",
                    Nickname: info.nickname
                }
            }
        ];
    }
}