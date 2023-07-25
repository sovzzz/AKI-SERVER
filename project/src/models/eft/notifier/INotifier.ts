import { Message } from "../profile/IAkiProfile";
export interface INotifierChannel
{
    server: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    channel_id: string,
    url: string
    notifierServer: string
    ws: string
}


export interface INotification
{
    type: NotificationType;
    eventId: string
    dialogId?: string
    message?: Message
}

export enum NotificationType
    {
    RAGFAIR_OFFER_SOLD = "RagfairOfferSold",
    NEW_MESSAGE = "new_message",
    PING = "ping"
}