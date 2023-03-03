import { inject, injectable } from "tsyringe";

import { ProfileHelper } from "../helpers/ProfileHelper";
import { TraderPurchaseData } from "../models/eft/profile/IAkiProfile";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { ITraderConfig } from "../models/spt/config/ITraderConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { ConfigServer } from "../servers/ConfigServer";
import { TimeUtil } from "../utils/TimeUtil";

/**
 * Help with storing limited item purchases from traders in profile to persist them over server restarts
 */
@injectable()
export class TraderPurchasePersisterService
{
    protected traderConfig: ITraderConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.traderConfig = this.configServer.getConfig(ConfigTypes.TRADER);
    }

    /**
     * Get the purchases made from a trader for this profile before the last trader reset
     * @param sessionId Session id
     * @param traderId Trader to loop up purchases for
     * @returns Dict of assort id and count purchased
     */
    public getProfileTraderPurchases(sessionId: string, traderId: string): Record<string, TraderPurchaseData>
    {
        const profile = this.profileHelper.getFullProfile(sessionId);

        if (!profile.traderPurchases)
        {
            return null;
        }

        return profile.traderPurchases[traderId];
    }

    /**
     * Remove all trader purchase records from all profiles that exist
     * @param traderId Traders id
     */
    public resetTraderPurchasesStoredInProfile(traderId: string): void
    {
        // Reset all profiles purchase dictionaries now a trader update has occured;
        const profiles = this.profileHelper.getProfiles();
        for (const profile of Object.values(profiles))
        {
            // Skip if no purchases
            if (!profile.traderPurchases)
            {
                continue;
            }

            // Skip if no trader-speicifc purchases
            if (!profile.traderPurchases[traderId])
            {
                continue;
            }

            profile.traderPurchases[traderId] = {};
        }
    }

    /**
     * Iterate over all server profiles and remove specific trader purchase data that has passed the trader refesh time
     * @param traderId Trader id
     */
    public removeStalePurchasesFromProfiles(traderId: string): void
    {
        const profiles = this.profileHelper.getProfiles();
        for (const profile of Object.values(profiles))
        {
            // Skip if no purchases
            if (!profile.traderPurchases)
            {
                continue;
            }

            // Skip if no trader-specifc purchases
            if (!profile.traderPurchases[traderId])
            {
                continue;
            }

            for (const purchaseKey in profile.traderPurchases[traderId])
            {
                const traderUpdateDetails = this.traderConfig.updateTime.find(x => x.traderId === traderId);
                if (!traderUpdateDetails)
                {
                    this.logger.error(`Unable to process trader purchases in profile: ${profile.info.id} as trader: ${traderId} cannot be found`);

                    continue;
                }

                const purchaseDetails = profile.traderPurchases[traderId][purchaseKey];
                const resetTimeForItem = purchaseDetails.purchaseTimestamp + traderUpdateDetails.seconds;
                if ((resetTimeForItem)  < this.timeUtil.getTimestamp())
                {
                    // Item was purchased far enough in past a trader refresh would have occured, remove purchase record from profile
                    this.logger.debug(`Removed trader: ${traderId} purchase: ${purchaseKey} from profile: ${profile.info.id}`);
                    delete profile.traderPurchases[traderId][purchaseKey];
                }
            }
        }
    }
}