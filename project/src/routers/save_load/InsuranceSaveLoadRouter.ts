import { injectable } from "tsyringe";

import { HandledRoute, SaveLoadRouter } from "../../di/Router";
import { IAkiProfile } from "../../models/eft/profile/IAkiProfile";

@injectable()
export class InsuranceSaveLoadRouter extends SaveLoadRouter 
{
    constructor() 
    {
        super();
    }

    public override getHandledRoutes(): HandledRoute[] 
    {
        return [
            new HandledRoute("aki-insurance", false)
        ];
    }

    public override handleLoad(profile: IAkiProfile): IAkiProfile 
    {
        if (profile.insurance === undefined)
        {
            profile.insurance = [];
        }
        return profile;
    }
}