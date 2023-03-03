import { inject, injectable } from "tsyringe";

import { INotification } from "../models/eft/notifier/INotifier";
import { Message, MessageContentRagfair } from "../models/eft/profile/IAkiProfile";
import { HttpServerHelper } from "./HttpServerHelper";

@injectable()
export class NotifierHelper
{
    /**
     * The default notification sent when waiting times out.
     */
    protected defaultNotification: INotification = {
        type: "ping",
        eventId: "ping"
    };

    constructor(
        @inject("HttpServerHelper") protected httpServerHelper: HttpServerHelper
    )
    {}

    public getDefaultNotification(): INotification
    {
        return this.defaultNotification;
    }

    /** Creates a new notification that displays the "Your offer was sold!" prompt and removes sold offer from "My Offers" on clientside */
    public createRagfairOfferSoldNotification(dialogueMessage: Message, ragfairData: MessageContentRagfair): INotification
    {
        return {
            "type": "RagfairOfferSold",
            "eventId": dialogueMessage._id,
            "dialogId": dialogueMessage.uid,
            ...ragfairData
        };
    }

    /** Creates a new notification with the specified dialogueMessage object. */
    public createNewMessageNotification(dialogueMessage: Message): INotification
    {
        return {
            type: "new_message",
            eventId: dialogueMessage._id,
            dialogId: dialogueMessage.uid,
            message: dialogueMessage
        };
    }

    public getWebSocketServer(sessionID: string): string
    {
        return `${this.httpServerHelper.getWebsocketUrl()}/notifierServer/getwebsocket/${sessionID}`;
    }
}