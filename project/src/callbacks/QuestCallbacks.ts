import { inject, injectable } from "tsyringe";

import { QuestController } from "../controllers/QuestController";
import { RepeatableQuestController } from "../controllers/RepeatableQuestController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IQuest } from "../models/eft/common/tables/IQuest";
import { IPmcDataRepeatableQuest } from "../models/eft/common/tables/IRepeatableQuests";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IAcceptQuestRequestData } from "../models/eft/quests/IAcceptQuestRequestData";
import { ICompleteQuestRequestData } from "../models/eft/quests/ICompleteQuestRequestData";
import { IHandoverQuestRequestData } from "../models/eft/quests/IHandoverQuestRequestData";
import { IListQuestsRequestData } from "../models/eft/quests/IListQuestsRequestData";
import { IRepeatableQuestChangeRequest } from "../models/eft/quests/IRepeatableQuestChangeRequest";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class QuestCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("QuestController") protected questController: QuestController,
        @inject("RepeatableQuestController") protected repeatableQuestController: RepeatableQuestController)
    { }

    public changeRepeatableQuest(pmcData: IPmcData, body: IRepeatableQuestChangeRequest, sessionID: string): IItemEventRouterResponse
    {
        return this.repeatableQuestController.changeRepeatableQuest(pmcData, body, sessionID);
    }

    public acceptQuest(pmcData: IPmcData, body: IAcceptQuestRequestData, sessionID: string): IItemEventRouterResponse
    {
        if (body.type === "repeatable")
        {
            return this.questController.acceptRepeatableQuest(pmcData, body, sessionID);
        }

        return this.questController.acceptQuest(pmcData, body, sessionID);
    }

    public completeQuest(pmcData: IPmcData, body: ICompleteQuestRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.questController.completeQuest(pmcData, body, sessionID);
    }

    public handoverQuest(pmcData: IPmcData, body: IHandoverQuestRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.questController.handoverQuest(pmcData, body, sessionID);
    }

    /**
     * Handle client/quest/list
     * @param url 
     * @param info 
     * @param sessionID 
     * @returns 
     */
    public listQuests(url: string, info: IListQuestsRequestData, sessionID: string): IGetBodyResponseData<IQuest[]>
    {
        return this.httpResponse.getBody(this.questController.getClientQuests(sessionID));
    }

    public activityPeriods(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<IPmcDataRepeatableQuest[]>
    {
        return this.httpResponse.getBody(this.repeatableQuestController.getClientRepeatableQuests(info, sessionID));
    }
}
