import { inject, injectable } from "tsyringe";
import { PresetHelper } from "../helpers/PresetHelper";
import { Preset } from "../models/eft/common/IGlobals";
import { DatabaseServer } from "../servers/DatabaseServer";

@injectable()
export class PresetController
{
    constructor(
        @inject("PresetHelper") protected presetHelper: PresetHelper,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer
    )
    { }

    public initialize(): void
    {
        const presets: Preset[] = Object.values(this.databaseServer.getTables().globals.ItemPresets);
        const reverse: Record<string, string[]> = {};

        for (const preset of presets)
        {
            const tpl = preset._items[0]._tpl;

            if (!(tpl in reverse))
            {
                reverse[tpl] = [];
            }

            reverse[tpl].push(preset._id);
        }

        this.presetHelper.hydratePresetStore(reverse);
    }
}
