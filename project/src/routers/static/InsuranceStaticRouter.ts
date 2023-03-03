import { inject, injectable } from "tsyringe";
import { InsuranceCallbacks } from "../../callbacks/InsuranceCallbacks";
import { RouteAction, StaticRouter } from "../../di/Router";

@injectable()
export class InsuranceStaticRouter extends StaticRouter 
{
    constructor(
        @inject("InsuranceCallbacks") protected insuranceCallbacks: InsuranceCallbacks
    ) 
    {
        super(
            [
                new RouteAction(
                    "/client/insurance/items/list/cost",
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any => 
                    {
                        return this.insuranceCallbacks.getInsuranceCost(url, info, sessionID);
                    }
                )
            ]
        );
    }
}