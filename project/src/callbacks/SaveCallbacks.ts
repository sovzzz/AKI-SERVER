import { inject, injectable } from "tsyringe";
import { OnLoad } from "../di/OnLoad";
import { OnUpdate } from "../di/OnUpdate";

import { SaveServer } from "../servers/SaveServer";

@injectable()
export class SaveCallbacks implements OnLoad, OnUpdate
{
    constructor(
        @inject("SaveServer") protected saveServer: SaveServer
    )
    {
    }
    
    public async onLoad(): Promise<void>
    {
        this.saveServer.load();
    }

    public getRoute(): string 
    {
        return "aki-save";
    }

    public async onUpdate(secondsSinceLastRun: number): Promise<boolean>
    {
        // run every 15 seconds
        if (secondsSinceLastRun > 15)
        {
            this.saveServer.save();
            return true;
        }

        return false;
    }
}