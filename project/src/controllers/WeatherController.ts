import { inject, injectable } from "tsyringe";

import { WeatherGenerator } from "../generators/WeatherGenerator";
import { IWeatherData } from "../models/eft/weather/IWeatherData";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IWeatherConfig } from "../models/spt/config/IWeatherConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";

@injectable()
export class WeatherController
{
    protected weatherConfig: IWeatherConfig;

    constructor(
        @inject("WeatherGenerator") protected weatherGenerator: WeatherGenerator,
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.weatherConfig = this.configServer.getConfig(ConfigTypes.WEATHER);
    }

    public generate(): IWeatherData
    {
        let result: IWeatherData = {
            acceleration: 0,
            time: "",
            date: "",
            weather: null
        };

        result = this.weatherGenerator.calculateGameTime(result);
        result.weather = this.weatherGenerator.generateWeather();

        return result;
    }

    /**
     * Get the current in-raid time (MUST HAVE PLAYER LOGGED INTO CLIENT TO WORK)
     * @returns Date object
     */
    public getCurrentInRaidTime(): Date
    {
        return this.weatherGenerator.getInRaidTime(new Date());
    }
}