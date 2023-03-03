import { inject, injectable } from "tsyringe";

import { WeatherCallbacks } from "../../callbacks/WeatherCallbacks";
import { RouteAction, StaticRouter } from "../../di/Router";

@injectable()
export class WeatherStaticRouter extends StaticRouter 
{
    constructor(
        @inject("WeatherCallbacks") protected weatherCallbacks: WeatherCallbacks
    ) 
    {
        super(
            [
                new RouteAction(
                    "/client/weather", 
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any => 
                    {
                        return this.weatherCallbacks.getWeather(url, info, sessionID);
                    })
            ]
        );
    }
}