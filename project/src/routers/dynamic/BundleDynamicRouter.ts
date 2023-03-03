import { inject, injectable } from "tsyringe";

import { BundleCallbacks } from "../../callbacks/BundleCallbacks";
import { DynamicRouter, RouteAction } from "../../di/Router";

@injectable()
export class BundleDynamicRouter extends DynamicRouter 
{
    constructor(
        @inject("BundleCallbacks") protected bundleCallbacks: BundleCallbacks
    ) 
    {
        super(
            [
                new RouteAction(
                    ".bundle",
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any =>
                    {
                        return this.bundleCallbacks.getBundle(url, info, sessionID);
                    }
                )
            ]
        );
    }
}