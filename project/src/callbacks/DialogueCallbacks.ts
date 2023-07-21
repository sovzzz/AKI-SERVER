import { inject, injectable } from "tsyringe";

import { DialogueController } from "../controllers/DialogueController";
import { OnUpdate } from "../di/OnUpdate";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IAcceptFriendRequestData, ICancelFriendRequestData } from "../models/eft/dialog/IAcceptFriendRequestData";
import { IChatServer } from "../models/eft/dialog/IChatServer";
import { IClearMailMessageRequest } from "../models/eft/dialog/IClearMailMessageRequest";
import { IDeleteFriendRequest } from "../models/eft/dialog/IDeleteFriendRequest";
import { IFriendRequestData } from "../models/eft/dialog/IFriendRequestData";
import { IFriendRequestSendResponse } from "../models/eft/dialog/IFriendRequestSendResponse";
import { IGetAllAttachmentsRequestData } from "../models/eft/dialog/IGetAllAttachmentsRequestData";
import { IGetAllAttachmentsResponse } from "../models/eft/dialog/IGetAllAttachmentsResponse";
import { IGetChatServerListRequestData } from "../models/eft/dialog/IGetChatServerListRequestData";
import { IGetFriendListDataResponse } from "../models/eft/dialog/IGetFriendListDataResponse";
import { IGetMailDialogInfoRequestData } from "../models/eft/dialog/IGetMailDialogInfoRequestData";
import { IGetMailDialogListRequestData } from "../models/eft/dialog/IGetMailDialogListRequestData";
import { IGetMailDialogViewRequestData } from "../models/eft/dialog/IGetMailDialogViewRequestData";
import {
    IGetMailDialogViewResponseData
} from "../models/eft/dialog/IGetMailDialogViewResponseData";
import { IPinDialogRequestData } from "../models/eft/dialog/IPinDialogRequestData";
import { IRemoveDialogRequestData } from "../models/eft/dialog/IRemoveDialogRequestData";
import { IRemoveMailMessageRequest } from "../models/eft/dialog/IRemoveMailMessageRequest";
import { ISendMessageRequest } from "../models/eft/dialog/ISendMessageRequest";
import { ISetDialogReadRequestData } from "../models/eft/dialog/ISetDialogReadRequestData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { INullResponseData } from "../models/eft/httpResponse/INullResponseData";
import { DialogueInfo } from "../models/eft/profile/IAkiProfile";
import { HashUtil } from "../utils/HashUtil";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { TimeUtil } from "../utils/TimeUtil";

@injectable()
export class DialogueCallbacks implements OnUpdate
{
    constructor(
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("DialogueController") protected dialogueController: DialogueController
    )
    {
    }

    /**
     * Handle client/friend/list
     * @returns IGetFriendListDataResponse
     */
    public getFriendList(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<IGetFriendListDataResponse>
    {
        return this.httpResponse.getBody(this.dialogueController.getFriendList(sessionID));
    }

    /**
     * Handle client/chatServer/list
     * @returns IChatServer[]
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getChatServerList(url: string, info: IGetChatServerListRequestData, sessionID: string): IGetBodyResponseData<IChatServer[]>
    {

        const chatServer: IChatServer =
            {
                _id: this.hashUtil.generate(),
                RegistrationId: 20,
                DateTime: this.timeUtil.getTimestamp(),
                IsDeveloper: true,
                Regions: ["EUR"],
                "VersionId": "bgkidft87ddd",
                "Ip": "",
                "Port": 0,
                "Chats": [
                    {
                        "_id": "0",
                        "Members": 0
                    }
                ]
            };

        return this.httpResponse.getBody([chatServer]);
    }

    /** Handle client/mail/dialog/list */
    public getMailDialogList(url: string, info: IGetMailDialogListRequestData, sessionID: string): IGetBodyResponseData<DialogueInfo[]>
    {
        return this.httpResponse.getBody(this.dialogueController.generateDialogueList(sessionID));
    }

    /** Handle client/mail/dialog/view */
    public getMailDialogView(url: string, info: IGetMailDialogViewRequestData, sessionID: string): IGetBodyResponseData<IGetMailDialogViewResponseData>
    {
        return this.httpResponse.getBody(this.dialogueController.generateDialogueView(info, sessionID));
    }

    /** Handle client/mail/dialog/info */
    public getMailDialogInfo(url: string, info: IGetMailDialogInfoRequestData, sessionID: string): IGetBodyResponseData<DialogueInfo>
    {
        return this.httpResponse.getBody(this.dialogueController.getDialogueInfo(info.dialogId, sessionID));
    }

    /** Handle client/mail/dialog/remove */
    public removeDialog(url: string, info: IRemoveDialogRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        this.dialogueController.removeDialogue(info.dialogId, sessionID);
        return this.httpResponse.emptyArrayResponse();
    }

    /** Handle client/mail/dialog/pin */
    public pinDialog(url: string, info: IPinDialogRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        this.dialogueController.setDialoguePin(info.dialogId, true, sessionID);
        return this.httpResponse.emptyArrayResponse();
    }

    /** Handle client/mail/dialog/unpin */
    public unpinDialog(url: string, info: IPinDialogRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        this.dialogueController.setDialoguePin(info.dialogId, false, sessionID);
        return this.httpResponse.emptyArrayResponse();
    }

    /** Handle client/mail/dialog/read */
    public setRead(url: string, info: ISetDialogReadRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        this.dialogueController.setRead(info.dialogs, sessionID);
        return this.httpResponse.emptyArrayResponse();
    }

    /**
     * Handle client/mail/dialog/getAllAttachments
     * @returns IGetAllAttachmentsResponse
     */
    public getAllAttachments(url: string, info: IGetAllAttachmentsRequestData, sessionID: string): IGetBodyResponseData<IGetAllAttachmentsResponse>
    {
        return this.httpResponse.getBody(this.dialogueController.getAllAttachments(info.dialogId, sessionID));
    }

    /** Handle client/mail/msg/send */
    public sendMessage(url: string, request: ISendMessageRequest, sessionID: string): IGetBodyResponseData<string>
    {
        return this.httpResponse.getBody(this.dialogueController.sendMessage(sessionID, request));
    }

    /** Handle client/friend/request/list/outbox */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public listOutbox(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        return this.httpResponse.getBody([]);
    }

    /**
     * Handle client/friend/request/list/inbox
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public listInbox(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<any[]>
    {
        return this.httpResponse.getBody([]);
    }

    /**
     * Handle client/friend/request/send
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public sendFriendRequest(url: string, request: IFriendRequestData, sessionID: string): IGetBodyResponseData<IFriendRequestSendResponse>
    {
        return this.httpResponse.getBody({status: 0, requestid: "12345", retryAfter: 600});
    }

    /**
     * Handle client/friend/request/accept
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public acceptFriendRequest(url: string, request: IAcceptFriendRequestData, sessionID: string): IGetBodyResponseData<boolean>
    {
        return this.httpResponse.getBody(true);
    }

    /**
     * Handle client/friend/request/cancel
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public cancelFriendRequest(url: string, request: ICancelFriendRequestData, sessionID: string): IGetBodyResponseData<boolean>
    {
        return this.httpResponse.getBody(true);
    }

    /** Handle client/friend/delete */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public deleteFriend(url: string, request: IDeleteFriendRequest, sessionID: string): INullResponseData
    {
        return this.httpResponse.nullResponse();
    }

    /** Handle client/friend/ignore/set */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public ignoreFriend(url: string, request: {uid: string}, sessionID: string): any
    {
        return this.httpResponse.nullResponse();
    }

    /** Handle client/friend/ignore/remove */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public unIgnoreFriend(url: string, request: {uid: string}, sessionID: string): any
    {
        return this.httpResponse.nullResponse();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public clearMail(url: string, request: IClearMailMessageRequest, sessionID: string): IGetBodyResponseData<any[]>
    {
        return this.httpResponse.emptyArrayResponse();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public removeMail(url: string, request: IRemoveMailMessageRequest, sessionID: string): IGetBodyResponseData<any[]>
    {
        return this.httpResponse.emptyArrayResponse();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async onUpdate(timeSinceLastRun: number): Promise<boolean>
    {
        this.dialogueController.update();
        return true;
    }

    public getRoute(): string
    {
        return "aki-dialogue";
    }
}
