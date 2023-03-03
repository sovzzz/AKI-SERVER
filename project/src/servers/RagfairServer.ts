import { inject, injectable } from "tsyringe";

import { RagfairOfferGenerator } from "../generators/RagfairOfferGenerator";
import { TraderAssortHelper } from "../helpers/TraderAssortHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IRagfairOffer } from "../models/eft/ragfair/IRagfairOffer";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { Traders } from "../models/enums/Traders";
import { IRagfairConfig } from "../models/spt/config/IRagfairConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { LocalisationService } from "../services/LocalisationService";
import { RagfairCategoriesService } from "../services/RagfairCategoriesService";
import { RagfairOfferService } from "../services/RagfairOfferService";
import { RagfairRequiredItemsService } from "../services/RagfairRequiredItemsService";
import { ConfigServer } from "./ConfigServer";

@injectable()
export class RagfairServer
{
    protected ragfairConfig: IRagfairConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("RagfairOfferGenerator") protected ragfairOfferGenerator: RagfairOfferGenerator,
        @inject("RagfairOfferService") protected ragfairOfferService: RagfairOfferService,
        @inject("RagfairCategoriesService") protected ragfairCategoriesService: RagfairCategoriesService,
        @inject("RagfairRequiredItemsService") protected ragfairRequiredItemsService: RagfairRequiredItemsService,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("TraderAssortHelper") protected traderAssortHelper: TraderAssortHelper,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.ragfairConfig = this.configServer.getConfig(ConfigTypes.RAGFAIR);
    }

    public async load(): Promise<void>
    {
        await this.ragfairOfferGenerator.generateDynamicOffers();
        await this.update();
    }

    public async update(): Promise<void>
    {
        this.ragfairOfferService.expireStaleOffers();

        // Generate trader offers
        const traders = this.getUpdateableTraders();
        for (const traderID of traders)
        {
            // Skip generating fence offers
            if (traderID === Traders.FENCE)
            {
                continue;
            }

            if (this.ragfairOfferService.traderOffersNeedRefreshing(traderID))
            {
                this.ragfairOfferGenerator.generateFleaOffersForTrader(traderID);
            }
        }

        // Regen expired offers when over threshold count
        if (this.ragfairOfferService.getExpiredOfferCount() >= this.ragfairConfig.dynamic.expiredOfferThreshold)
        {
            const expiredOfferItems = this.ragfairOfferService.getExpiredOfferItems();
            await this.ragfairOfferGenerator.generateDynamicOffers(expiredOfferItems);

            // reset expired offers now we've genned them
            this.ragfairOfferService.resetExpiredOffers();
        }

        this.ragfairRequiredItemsService.buildRequiredItemTable();
    }

    /**
     * Get traders who need to be periodically refreshed
     * @returns string array of traders
     */
    protected getUpdateableTraders(): string[]
    {
        return Object.keys(this.ragfairConfig.traders).filter(x => this.ragfairConfig.traders[x]);
    }

    public getAllCategories(): Record<string, number>
    {
        return this.ragfairCategoriesService.getAllCategories();
    }

    public getBespokeCategories(offers: IRagfairOffer[]): Record<string, number>
    {
        return this.ragfairCategoriesService.getBespokeCategories(offers);
    }

    /**
     * Disable/Hide an offer from flea
     * @param offerId
     */
    public hideOffer(offerId: string): void
    {
        const offers = this.ragfairOfferService.getOffers();
        const offer = offers.find(x => x._id === offerId);

        if (!offer)
        {
            this.logger.error(this.localisationService.getText("ragfair-offer_not_found_unable_to_hide", offerId));

            return;
        }

        offer.locked = true;
    }

    public getOffer(offerID: string): IRagfairOffer
    {
        return this.ragfairOfferService.getOfferByOfferId(offerID);
    }

    public getOffers(): IRagfairOffer[]
    {
        return this.ragfairOfferService.getOffers();
    }

    public removeOfferStack(offerID: string, amount: number): void
    {
        return this.ragfairOfferService.removeOfferStack(offerID, amount);
    }

    public doesOfferExist(offerId: string): boolean
    {
        return this.ragfairOfferService.doesOfferExist(offerId);
    }

    public addPlayerOffers(): void
    {
        this.ragfairOfferService.addPlayerOffers();
    }
}