import { inject, injectable } from "tsyringe";

import { INotification, NotificationType } from "../models/eft/notifier/INotifier";
import { Dialogue, IUserDialogInfo, Message } from "../models/eft/profile/IAkiProfile";
import { MemberCategory } from "../models/enums/MemberCategory";
import { MessageType } from "../models/enums/MessageType";
import { SaveServer } from "../servers/SaveServer";
import { WebSocketServer } from "../servers/WebSocketServer";
import { NotificationService } from "../services/NotificationService";
import { HashUtil } from "../utils/HashUtil";

@injectable()
export class NotificationSendHelper
{
    constructor(
        @inject("WebSocketServer") protected webSocketServer: WebSocketServer,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("NotificationService") protected notificationService: NotificationService
    )
    {}

    /**
     * Send notification message to the appropriate channel
     * @param sessionID 
     * @param notificationMessage 
     */
    public sendMessage(sessionID: string, notificationMessage: INotification): void
    {
        if (this.webSocketServer.isConnectionWebSocket(sessionID))
        {
            this.webSocketServer.sendMessage(sessionID, notificationMessage);
        }
        else
        {
            this.notificationService.add(sessionID, notificationMessage);
        }
    }

    /**
     * Send a message directly to the player
     * @param sessionId Session id
     * @param senderDetails Who is sendin the message to player
     * @param messageText Text to send player
     * @param messageType Underlying type of message being sent
     */
    public sendMessageToPlayer(sessionId: string, senderDetails: IUserDialogInfo, messageText: string, messageType: MessageType): void
    {
        const dialog = this.getDialog(sessionId, messageType, senderDetails);

        dialog.new += 1;
        const message: Message = {
            _id: this.hashUtil.generate(),
            uid: dialog._id,
            type: messageType,
            dt: Math.round(Date.now() / 1000),
            text: messageText,
            hasRewards: undefined,
            rewardCollected: undefined,
            items: undefined
        };
        dialog.messages.push(message);

        const notification: INotification = {
            type: NotificationType.NEW_MESSAGE,
            eventId: message._id,
            dialogId: message.uid,
            message: message
        };
        this.sendMessage(sessionId, notification);
    }

    /**
     * Helper function for sendMessageToPlayer(), get new dialog for storage in profile or find existing by sender id
     * @param sessionId Session id
     * @param messageType Type of message to generate
     * @param senderDetails Who is sending the message
     * @returns Dialogue
     */
    protected getDialog(sessionId: string, messageType: MessageType, senderDetails: IUserDialogInfo): Dialogue
    {
        // Use trader id if sender is trader, otherwise use nickname
        const key = (senderDetails.info.MemberCategory === MemberCategory.TRADER) ? senderDetails._id : senderDetails.info.Nickname;
        const dialogueData = this.saveServer.getProfile(sessionId).dialogues;
        const isNewDialogue = !(key in dialogueData);
        let dialogue: Dialogue = dialogueData[key];

        // Existing dialog not found, make new one
        if (isNewDialogue)
        {
            dialogue = {
                _id: key,
                type: messageType,
                messages: [],
                pinned: false,
                new: 0,
                attachmentsNew: 0,
                Users: (senderDetails.info.MemberCategory === MemberCategory.TRADER) ? undefined : [senderDetails]
            };

            dialogueData[key] = dialogue;
        }
        return dialogue;
    }
}