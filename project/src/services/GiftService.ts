import { inject, injectable } from "tsyringe";
import { DialogueHelper } from "../helpers/DialogueHelper";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";

@injectable()
export class GiftService
{
    protected giftConfig: any;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DialogueHelper") protected dialogueHelper: DialogueHelper,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.giftConfig = this.configServer.getConfig(ConfigTypes.QUEST);
    }

    /**
     * Send a player a gift
     * @param playerId Player to send gift to
     * @param giftId Id of gift to send player
     */
    public sendGiftToPlayer(playerId: string, giftId: string): void
    {
        return;
    }
}