import { JsonUtil } from "../utils/JsonUtil";
import { VFS } from "../utils/VFS";

import { inject, injectable } from "tsyringe";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { ICoreConfig } from "../models/spt/config/ICoreConfig";

@injectable()
export class ConfigServer 
{
    protected configs: Record<string, any> = {};

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("VFS") protected vfs: VFS,
        @inject("JsonUtil") protected jsonUtil: JsonUtil
    )
    {
        this.initialize();
    }

    public getConfig<T>(configType: ConfigTypes): T
    {
        return this.configs[configType];
    }

    public getConfigByString<T>(configType: string): T
    {
        return this.configs[configType];
    }

    public initialize(): void
    {
        this.logger.debug("Importing configs...");

        // get all filepaths
        const filepath = (globalThis.G_RELEASE_CONFIGURATION) ? "Aki_Data/Server/configs/" : "./assets/configs/";
        const files = this.vfs.getFiles(filepath);

        // add file content to result
        for (const file of files)
        {
            if (this.vfs.getFileExtension(file) === "json")
            {
                const filename = this.vfs.stripExtension(file);
                const filePathAndName = `${filepath}${file}`;
                this.configs[`aki-${filename}`] = this.jsonUtil.deserializeWithCacheCheck(this.vfs.readFile(filePathAndName), filePathAndName);
            }
        }
        
        this.logger.info(`Commit hash: ${(this.configs[ConfigTypes.CORE] as ICoreConfig).commit || "DEBUG"}`);
    }
}
