import { inject, injectable } from "tsyringe";

import { NotifierController } from "../controllers/NotifierController";
import { HttpServerHelper } from "../helpers/HttpServerHelper";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { INotifierChannel } from "../models/eft/notifier/INotifier";
import { ISelectProfileRequestData } from "../models/eft/notifier/ISelectProfileRequestData";
import { ISelectProfileResponse } from "../models/eft/notifier/ISelectProfileResponse";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class NotifierCallbacks
{
    constructor(
        @inject("HttpServerHelper") protected httpServerHelper: HttpServerHelper,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("NotifierController") protected notifierController: NotifierController)
    { }

    /**
     * If we don't have anything to send, it's ok to not send anything back
     * because notification requests can be long-polling. In fact, we SHOULD wait
     * until we actually have something to send because otherwise we'd spam the client
     * and the client would abort the connection due to spam.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public sendNotification(sessionID: string, req: any, resp: any, data: any): void
    {
        const splittedUrl = req.url.split("/");
        const tmpSessionID = splittedUrl[splittedUrl.length - 1].split("?last_id")[0];

        /**
         * Take our array of JSON message objects and cast them to JSON strings, so that they can then
         *  be sent to client as NEWLINE separated strings... yup.
         */
        this.notifierController.notifyAsync(tmpSessionID)
            .then((messages: any) => messages.map((message: any) => JSON.stringify(message)).join("\n"))
            .then((text) => this.httpServerHelper.sendTextJson(resp, text));
    }

    /** Handle push/notifier/get */
    /** Handle push/notifier/getwebsocket */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getNotifier(url: string, info: any, sessionID: string): IGetBodyResponseData<any[]>
    {
        return this.httpResponse.emptyArrayResponse();
    }

    /** Handle client/notifier/channel/create */
    public createNotifierChannel(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<INotifierChannel>
    {
        return this.httpResponse.getBody(this.notifierController.getChannel(sessionID));
    }

    /**
     * Handle client/game/profile/select
     * @returns ISelectProfileResponse
     */
    public selectProfile(url: string, info: ISelectProfileRequestData, sessionID: string): IGetBodyResponseData<ISelectProfileResponse>
    {
        return this.httpResponse.getBody({
            status: "ok",
            notifier: this.notifierController.getChannel(sessionID),
            notifierServer: this.notifierController.getServer(sessionID)
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public notify(url: string, info: any, sessionID: string): string
    {
        return "NOTIFY";
    }
}