import { inject, injectable } from "tsyringe";

import { INotification, NotificationType } from "../models/eft/notifier/INotifier";
import { Message, MessageContentRagfair } from "../models/eft/profile/IAkiProfile";
import { HttpServerHelper } from "./HttpServerHelper";

@injectable()
export class NotifierHelper
{
    /**
     * The default notification sent when waiting times out.
     */
    protected defaultNotification: INotification = {
        type: NotificationType.PING,
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

    /**
     * Create a new notification that displays the "Your offer was sold!" prompt and removes sold offer from "My Offers" on clientside
     * @param dialogueMessage Message from dialog that was sent
     * @param ragfairData Ragfair data to attach to notification
     * @returns 
     */
    public createRagfairOfferSoldNotification(dialogueMessage: Message, ragfairData: MessageContentRagfair): INotification
    {
        return {
            type: NotificationType.RAGFAIR_OFFER_SOLD,
            eventId: dialogueMessage._id,
            dialogId: dialogueMessage.uid,
            ...ragfairData
        };
    }

    /**
     * Create a new notification with the specified dialogueMessage object
     * @param dialogueMessage 
     * @returns 
     */
    public createNewMessageNotification(dialogueMessage: Message): INotification
    {
        return {
            type: NotificationType.NEW_MESSAGE,
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