import { inject, injectable } from "tsyringe";

import { ConfigTypes } from "../models/enums/ConfigTypes";
import { ISeasonalEventConfig } from "../models/spt/config/ISeasonalEventConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";

@injectable()
export class GameEventHelper
{
    protected seasonalEventConfig: ISeasonalEventConfig;

    constructor(
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.seasonalEventConfig = this.configServer.getConfig(ConfigTypes.SEASONAL_EVENT);
    }

}