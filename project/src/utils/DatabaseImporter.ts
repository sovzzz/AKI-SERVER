import { inject, injectable } from "tsyringe";

import { OnLoad } from "../di/OnLoad";
import { IDatabaseTables } from "../models/spt/server/IDatabaseTables";
import { ILogger } from "../models/spt/utils/ILogger";
import { ImageRouter } from "../routers/ImageRouter";
import { DatabaseServer } from "../servers/DatabaseServer";
import { LocalisationService } from "../services/LocalisationService";
import { EncodingUtil } from "./EncodingUtil";
import { HashUtil } from "./HashUtil";
import { ImporterUtil } from "./ImporterUtil";
import { JsonUtil } from "./JsonUtil";
import { VFS } from "./VFS";

@injectable()
export class DatabaseImporter implements OnLoad
{
    private hashedFile: any;
    private valid = VaildationResult.UNDEFINED;
    private filepath;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("VFS") protected vfs: VFS,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ImageRouter") protected imageRouter: ImageRouter,
        @inject("EncodingUtil") protected encodingUtil: EncodingUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("ImporterUtil") protected importerUtil: ImporterUtil
    )
    {
    }
    
    public async onLoad(): Promise<void>
    {
        this.filepath = (globalThis.G_RELEASE_CONFIGURATION) ? "Aki_Data/Server/" : "./assets/";
        
        if (globalThis.G_RELEASE_CONFIGURATION)
        {
            try 
            {
            // reading the dynamic SHA1 file - Ask Alex or Chomp
                const file = "checks.dat";
                const fileWithPath = `${this.filepath}${file}`;
                if (this.vfs.exists(fileWithPath))
                    this.hashedFile = this.jsonUtil.deserialize(this.encodingUtil.fromBase64(this.vfs.readFile(fileWithPath)));
                else
                {
                    this.valid = VaildationResult.NOT_FOUND;
                    this.logger.debug(this.localisationService.getText("validation_not_found"));
                }
            }
            catch (e)
            {
                this.valid = VaildationResult.FAILED;
                this.logger.warning(this.localisationService.getText("validation_error_decode"));
            }
        }

        await this.hydrateDatabase(this.filepath);

        this.loadImages(`${this.filepath}images/`);
    }

    /**
     * Read all json files in database folder and map into a json object
     * @param filepath path to database folder
     */
    protected async hydrateDatabase(filepath: string): Promise<void>
    {
        this.logger.info(this.localisationService.getText("importing_database"));
        
        const dataToImport = await this.importerUtil.loadAsync<IDatabaseTables>(
            `${filepath}database/`,
            this.filepath,
            (fileWithPath: string, data: string) => this.onReadValidate(fileWithPath, data)
        );

        const validation = (this.valid === VaildationResult.FAILED || this.valid === VaildationResult.NOT_FOUND) ? "." : "";
        this.logger.info(`${this.localisationService.getText("importing_database_finish")}${validation}`);
        this.databaseServer.setTables(dataToImport);
    }
    
    private onReadValidate(fileWithPath: string, data: string): void
    {
        // Validate files
        if (globalThis.G_RELEASE_CONFIGURATION && this.hashedFile && !this.validateFile(fileWithPath, data))
            this.valid = VaildationResult.FAILED;
    }

    public getRoute(): string
    {
        return "aki-database";
    }
    
    private validateFile(filePathAndName: string, fileData: any): boolean
    {
        try 
        {
            const finalPath = filePathAndName.replace(this.filepath, "").replace(".json", "");
            let tempObject;
            for (const prop of finalPath.split("/"))
            {
                if (!tempObject)
                    tempObject = this.hashedFile[prop];
                else
                    tempObject = tempObject[prop];
            }

            if (tempObject !== this.hashUtil.generateSha1ForData(fileData))
            {
                this.logger.debug(this.localisationService.getText("validation_error_file", filePathAndName));
                return false;
            }
        }
        catch (e)
        {
            this.logger.warning(this.localisationService.getText("validation_error_exception", filePathAndName));
            this.logger.warning(e);
            return false;
        }
        return true;
    }

    public loadImages(filepath: string): void
    {
        const dirs = this.vfs.getDirs(filepath);
        const routes = [
            "/files/CONTENT/banners/",
            "/files/handbook/",
            "/files/Hideout/",
            "/files/launcher/",
            "/files/quest/icon/",
            "/files/trader/avatar/"
        ];

        for (const i in dirs)
        {
            const files = this.vfs.getFiles(`${filepath}${dirs[i]}`);

            for (const file of files)
            {
                const filename = this.vfs.stripExtension(file);
                this.imageRouter.addRoute(`${routes[i]}${filename}`, `${filepath}${dirs[i]}/${file}`);
            }
        }
        this.imageRouter.addRoute("/favicon.ico", `${filepath}icon.ico`);
    }
}

enum VaildationResult
    {
    SUCCESS,
    FAILED,
    NOT_FOUND,
    UNDEFINED
}