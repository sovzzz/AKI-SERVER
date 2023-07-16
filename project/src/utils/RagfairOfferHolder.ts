import { IRagfairOffer } from "../models/eft/ragfair/IRagfairOffer";

export class RagfairOfferHolder
{
    protected offersById: Map<string, IRagfairOffer>;
    protected offersByTemplate: Map<string, Map<string, IRagfairOffer>>;
    protected offersByTrader: Map<string, Map<string, IRagfairOffer>>;

    constructor()
    {
        this.offersById = new Map();
        this.offersByTemplate = new Map();
        this.offersByTrader = new Map();
    }

    public getOfferById(id: string): IRagfairOffer
    {
        if (this.offersById.has(id))
        {
            return this.offersById.get(id);
        }
        return undefined;
    }

    public getOffersByTemplate(templateId: string): Array<IRagfairOffer>
    {
        if (this.offersByTemplate.has(templateId))
        {
            return [...this.offersByTemplate.get(templateId).values()];
        }
        return undefined;
    }

    public getOffersByTrader(traderId: string): Array<IRagfairOffer>
    {
        if (this.offersByTrader.has(traderId))
        {
            return [...this.offersByTrader.get(traderId).values()];
        }
        return undefined;
    }

    public getOffers(): Array<IRagfairOffer>
    {
        if (this.offersById.size > 0)
        {
            return [...this.offersById.values()];
        }
        return [];
    }

    public addOffers(offers: Array<IRagfairOffer>): void
    {
        offers.forEach(o => this.addOffer(o));
    }

    public addOffer(offer: IRagfairOffer): void
    {
        const trader = offer.user.id;
        const offerId = offer._id;
        const template = offer.items[0]._tpl;
        this.offersById.set(offerId, offer);
        this.addOfferByTrader(trader, offer);
        this.addOfferByTemplates(template, offer);
    }

    public removeOffer(offer: IRagfairOffer): void
    {
        if (this.offersById.has(offer._id))
        {
            this.offersById.delete(offer._id);
            this.offersByTrader.get(offer.user.id).delete(offer._id);
            this.offersByTemplate.get(offer.items[0]._tpl).delete(offer._id);
        }
    }

    public removeOffers(offers: Array<IRagfairOffer>): void
    {
        offers.forEach(o => this.removeOffer(o));
    }
    
    public removeOfferByTrader(traderId: string): void
    {
        if (this.offersByTrader.has(traderId))
        {
            this.removeOffers([...this.offersByTrader.get(traderId).values()]);
        }
    }

    /**
     * Get an array of stale offers that are still shown to player
     * @returns IRagfairOffer array
     */
    public getStaleOffers(time: number): Array<IRagfairOffer>
    {
        return this.getOffers().filter(o => this.isStale(o, time));
    }

    protected addOfferByTemplates(template: string, offer: IRagfairOffer): void
    {
        if (this.offersByTemplate.has(template))
        {
            this.offersByTemplate.get(template).set(offer._id, offer);
        }
        else
        {
            const valueMapped = new Map<string, IRagfairOffer>();
            valueMapped.set(offer._id, offer);
            this.offersByTemplate.set(template, valueMapped);
        }
    }

    protected addOfferByTrader(trader: string, offer: IRagfairOffer): void
    {
        if (this.offersByTrader.has(trader))
        {
            this.offersByTrader.get(trader).set(offer._id, offer);
        }
        else
        {
            const valueMapped = new Map<string, IRagfairOffer>();
            valueMapped.set(offer._id, offer);
            this.offersByTrader.set(trader, valueMapped);
        }
    }

    protected isStale(offer: IRagfairOffer, time: number): boolean
    {
        return offer.endTime < time || offer.items[0].upd.StackObjectsCount < 1;
    }
}