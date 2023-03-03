import { injectable } from "tsyringe";

import { Money } from "../models/enums/Money";

@injectable()
export class PaymentHelper
{

    /**
     * Check whether tpl is Money
     * @param {string} tpl
     * @returns void
     */
    public isMoneyTpl(tpl: string): boolean
    {
        return [Money.DOLLARS, Money.EUROS, Money.ROUBLES].some(element => element === tpl);
    }

    /**
    * Gets currency TPL from TAG
    * @param {string} currency
    * @returns string
    */
    public getCurrency(currency: string): string
    {
        switch (currency)
        {
            case "EUR":
                return Money.EUROS;
            case "USD":
                return Money.DOLLARS;
            case "RUB":
                return Money.ROUBLES;
            default:
                return "";
        }
    }
}