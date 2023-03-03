import { injectable } from "tsyringe";

import { HandledRoute, SaveLoadRouter } from "../../di/Router";
import { IAkiProfile } from "../../models/eft/profile/IAkiProfile";

@injectable()
export class InraidSaveLoadRouter extends SaveLoadRouter 
{
    constructor() 
    {
        super();
    }

    public override getHandledRoutes(): HandledRoute[] 
    {
        return [
            new HandledRoute("aki-inraid", false)
        ];
    }

    public override handleLoad(profile: IAkiProfile): IAkiProfile 
    {
        if (profile.inraid === undefined)
        {
            profile.inraid = {
                location: "none",
                character: "none"
            };
        }

        return profile;
    }
}