import { inject, injectable, injectAll } from "tsyringe";

import { ItemEventRouterDefinition } from "../di/Router";
import { ProfileHelper } from "../helpers/ProfileHelper";
import { IItemEventRouterRequest } from "../models/eft/itemEvent/IItemEventRouterRequest";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { ILogger } from "../models/spt/utils/ILogger";
import { LocalisationService } from "../services/LocalisationService";
import { EventOutputHolder } from "./EventOutputHolder";

@injectable()
export class ItemEventRouter 
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @injectAll("IERouters") protected itemEventRouters: ItemEventRouterDefinition[],
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder
    ) 
    { }

    /**
     * 
     * @param info Event request
     * @param sessionID Session id
     * @returns Item response
     */
    public handleEvents(info: IItemEventRouterRequest, sessionID: string): IItemEventRouterResponse 
    {
        this.eventOutputHolder.resetOutput(sessionID);

        let result = this.eventOutputHolder.getOutput(sessionID);

        for (const body of info.data)
        {
            const pmcData = this.profileHelper.getPmcProfile(sessionID);

            const eventRouter = this.itemEventRouters.find(r => r.canHandle(body.Action));
            if (eventRouter) 
            {
                this.logger.debug(`event: ${body.Action}`);
                result = eventRouter.handleItemEvent(body.Action, pmcData, body, sessionID);
            }
            else 
            {
                this.logger.error(this.localisationService.getText("event-unhandled_event", body.Action));
                this.logger.writeToLogFile(body);
            }
        }

        this.eventOutputHolder.updateOutputProperties(sessionID);

        return result;
    }
}
