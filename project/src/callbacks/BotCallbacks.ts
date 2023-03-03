import { inject, injectable } from "tsyringe";

import { BotController } from "../controllers/BotController";
import { IGenerateBotsRequestData } from "../models/eft/bot/IGenerateBotsRequestData";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IBotBase } from "../models/eft/common/tables/IBotBase";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class BotCallbacks
{
    constructor(
        @inject("BotController") protected botController: BotController,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil)
    { }

    /**
     * Handle singleplayer/settings/bot/limit
     * @returns string
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getBotLimit(url: string, info: IEmptyRequestData, sessionID: string): string
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 1];
        return this.httpResponse.noBody(this.botController.getBotPresetGenerationLimit(type));
    }

    /**
     * Handle singleplayer/settings/bot/difficulty
     * @returns string
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getBotDifficulty(url: string, info: IEmptyRequestData, sessionID: string): string
    {
        const splittedUrl = url.split("/");
        const type = splittedUrl[splittedUrl.length - 2].toLowerCase();
        const difficulty = splittedUrl[splittedUrl.length - 1];
        if (difficulty === "core")
        {
            return this.httpResponse.noBody(this.botController.getBotCoreDifficulty());
        }

        return this.httpResponse.noBody(this.botController.getBotDifficulty(type, difficulty));
    }

    /**
     * Handle client/game/bot/generate
     * @returns IGetBodyResponseData
     */
    public generateBots(url: string, info: IGenerateBotsRequestData, sessionID: string): IGetBodyResponseData<IBotBase[]>
    {
        return this.httpResponse.getBody(this.botController.generate(sessionID, info));
    }

    /**
     * Handle singleplayer/settings/bot/maxCap
     * @returns string
     */
    public getBotCap(): string
    {
        return this.httpResponse.noBody(this.botController.getBotCap());
    }

    /**
     * Handle singleplayer/settings/bot/getBotBehaviours
     * @returns string
     */
    public getBotBehaviours(): string
    {
        return this.httpResponse.noBody(this.botController.getPmcBotTypes());
    }
}