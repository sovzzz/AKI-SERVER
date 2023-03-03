import { inject, injectable } from "tsyringe";

import { TraderCallbacks } from "../../callbacks/TraderCallbacks";
import { RouteAction, StaticRouter } from "../../di/Router";

@injectable()
export class TraderStaticRouter extends StaticRouter 
{
    constructor(
        @inject("TraderCallbacks") protected traderCallbacks: TraderCallbacks
    ) 
    {
        super(
            [
                new RouteAction(
                    "/client/trading/api/traderSettings", 
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any => 
                    {
                        return this.traderCallbacks.getTraderSettings(url, info, sessionID);
                    }
                )
            ]
        );
    }
}