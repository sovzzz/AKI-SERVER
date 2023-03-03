import { inject, injectable } from "tsyringe";

import { DynamicRouter, RouteAction } from "../../di/Router";
import { ImageRouter } from "../ImageRouter";

@injectable()
export class HttpDynamicRouter extends DynamicRouter 
{
    constructor(
        @inject("ImageRouter") protected imageRouter: ImageRouter
    ) 
    {
        super(
            [
                new RouteAction(
                    ".jpg",
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any =>
                    {
                        return this.imageRouter.getImage();
                    }
                ),
                new RouteAction(
                    ".png",
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any =>
                    {
                        return this.imageRouter.getImage();
                    }
                ),
                new RouteAction(
                    ".ico",
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (url: string, info: any, sessionID: string, output: string): any =>
                    {
                        return this.imageRouter.getImage();
                    }
                )
                
            ]
        );
    }
}