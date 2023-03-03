import { inject, injectable } from "tsyringe";
import { OnLoad } from "../di/OnLoad";
import { PostAkiModLoader } from "../loaders/PostAkiModLoader";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IHttpConfig } from "../models/spt/config/IHttpConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { LocalisationService } from "../services/LocalisationService";
import { HttpFileUtil } from "../utils/HttpFileUtil";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";

@injectable()
class ModCallbacks implements OnLoad
{
    protected httpConfig: IHttpConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("HttpFileUtil") protected httpFileUtil: HttpFileUtil,
        @inject("PostAkiModLoader") protected postAkiModLoader: PostAkiModLoader,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.httpConfig = this.configServer.getConfig(ConfigTypes.HTTP);
    }
    
    public async onLoad(): Promise<void>
    {
        if (globalThis.G_MODS_ENABLED)
        {
            await this.postAkiModLoader.load();
        }
    }

    public getRoute(): string
    {
        return "aki-mods";
    }
}

export { ModCallbacks };

