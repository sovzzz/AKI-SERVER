import { inject, injectable } from "tsyringe";

import { BundleLoader } from "../loaders/BundleLoader";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IHttpConfig } from "../models/spt/config/IHttpConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { HttpFileUtil } from "../utils/HttpFileUtil";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
export class BundleCallbacks
{
    protected httpConfig: IHttpConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("HttpFileUtil") protected httpFileUtil: HttpFileUtil,
        @inject("BundleLoader") protected bundleLoader: BundleLoader,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.httpConfig = this.configServer.getConfig(ConfigTypes.HTTP);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public sendBundle(sessionID: string, req: any, resp: any, body: any): any
    {
        this.logger.info(`[BUNDLE]: ${req.url}`);

        const key = req.url.split("/bundle/")[1];
        const bundle = this.bundleLoader.getBundle(key, true);

        // send bundle
        this.httpFileUtil.sendFile(resp, bundle.path);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getBundles(url: string, info: any, sessionID: string): string
    {
        const local = (this.httpConfig.ip === "127.0.0.1" || this.httpConfig.ip === "localhost");
        return this.httpResponse.noBody(this.bundleLoader.getBundles(local));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getBundle(url: string, info: any, sessionID: string): string
    {
        return "BUNDLE";
    }
}
