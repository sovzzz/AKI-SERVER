import { inject, injectable } from "tsyringe";

import { PresetController } from "../controllers/PresetController";
import { OnLoad } from "../di/OnLoad";

@injectable()
export class PresetCallbacks implements OnLoad
{
    constructor(
        @inject("PresetController") protected presetController: PresetController)
    {
    }

    public async onLoad(): Promise<void>
    {
        this.presetController.initialize();
    }

    public getRoute(): string 
    {
        return "aki-presets";
    }
}
