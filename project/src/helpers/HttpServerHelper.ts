import { inject, injectable } from "tsyringe";

import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IHttpConfig } from "../models/spt/config/IHttpConfig";
import { ConfigServer } from "../servers/ConfigServer";

@injectable()
export class HttpServerHelper
{
    protected httpConfig: IHttpConfig;

    protected mime = {
        "css": "text/css",
        "bin": "application/octet-stream",
        "html": "text/html",
        "jpg": "image/jpeg",
        "js": "text/javascript",
        "json": "application/json",
        "png": "image/png",
        "svg": "image/svg+xml",
        "txt": "text/plain"
    };

    constructor(
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.httpConfig = this.configServer.getConfig(ConfigTypes.HTTP);
    }

    public getMimeText(key: string): string
    {
        return this.mime[key];
    }

    public buildUrl(): string
    {
        return `${this.httpConfig.ip}:${this.httpConfig.port}`;
    }

    public getBackendUrl(): string
    {
        return `http://${this.buildUrl()}`;
    }

    public getWebsocketUrl(): string
    {
        return `ws://${this.buildUrl()}`;
    }

    public sendTextJson(resp: any, output: any): void
    {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        resp.writeHead(200, "OK", { "Content-Type": this.mime["json"] });
        resp.end(output);
    }
}