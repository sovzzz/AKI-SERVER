import { inject, injectable } from "tsyringe";

import { WeatherController } from "../controllers/WeatherController";
import { IEmptyRequestData } from "../models/eft/common/IEmptyRequestData";
import { IGetBodyResponseData } from "../models/eft/httpResponse/IGetBodyResponseData";
import { IWeatherData } from "../models/eft/weather/IWeatherData";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class WeatherCallbacks
{
    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("WeatherController") protected weatherController: WeatherController
    )
    { }

    /**
     * Handle client/weather
     * @returns IWeatherData
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getWeather(url: string, info: IEmptyRequestData, sessionID: string): IGetBodyResponseData<IWeatherData>
    {
        return this.httpResponse.getBody(this.weatherController.generate());
    }
}