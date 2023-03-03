import { inject, injectable } from "tsyringe";
import { INotification } from "../models/eft/notifier/INotifier";
import { WebSocketServer } from "../servers/WebSocketServer";
import { NotificationService } from "../services/NotificationService";

@injectable()
export class NotificationSendHelper
{
    constructor(
        @inject("WebSocketServer") protected webSocketServer: WebSocketServer,
        @inject("NotificationService") protected notificationService: NotificationService
    )
    {}

    /**
     * Send notification message to the appropriate channel
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
}