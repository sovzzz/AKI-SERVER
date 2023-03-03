import { inject, injectable } from "tsyringe";

import { MinMax } from "../models/common/MinMax";
import { IRandomisedBotLevelResult } from "../models/eft/bot/IRandomisedBotLevelResult";
import { ExpTable } from "../models/eft/common/IGlobals";
import { IBotBase } from "../models/eft/common/tables/IBotBase";
import { BotGenerationDetails } from "../models/spt/bots/BotGenerationDetails";
import { ILogger } from "../models/spt/utils/ILogger";
import { DatabaseServer } from "../servers/DatabaseServer";
import { RandomUtil } from "../utils/RandomUtil";

@injectable()
export class BotLevelGenerator
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer
    )
    { }

    /**
     * Return a randomised bot level and exp value
     * @param levelDetails min and max of level for bot
     * @param botGenerationDetails Deatils to help generate a bot
     * @param bot being level is being generated for
     * @returns IRandomisedBotLevelResult object
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public generateBotLevel(levelDetails: MinMax, botGenerationDetails: BotGenerationDetails, bot: IBotBase): IRandomisedBotLevelResult
    {
        const expTable = this.databaseServer.getTables().globals.config.exp.level.exp_table;
        const highestLevel = this.getHighestRelativeBotLevel(botGenerationDetails.playerLevel, botGenerationDetails.botRelativeLevelDeltaMax, levelDetails, expTable);
        
        // Get random level based on the exp table.
        let exp = 0;
        const level = this.randomUtil.getInt(1, highestLevel);

        for (let i = 0; i < level; i++)
        {
            exp += expTable[i].exp;
        }

        // Sprinkle in some random exp within the level, unless we are at max level.
        if (level < expTable.length - 1)
        {
            exp += this.randomUtil.getInt(0, expTable[level].exp - 1);
        }

        return { level, exp };
    }

    /**
     * Get the highest level a bot can be relative to the players level, but no futher than the max size from globals.exp_table
     * @param playerLevel Players current level
     * @param relativeDeltaMax max delta above player level to go
     * @returns highest level possible for bot
     */
    protected getHighestRelativeBotLevel(playerLevel: number, relativeDeltaMax: number, levelDetails: MinMax, expTable: ExpTable[]): number
    {
        const maxPossibleLevel = Math.min(levelDetails.max, expTable.length);

        let level = playerLevel + relativeDeltaMax;
        if (level > maxPossibleLevel)
        {
            level = maxPossibleLevel;
        }

        return level;
    }
}