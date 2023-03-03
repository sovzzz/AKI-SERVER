import { inject, injectable } from "tsyringe";

import { HandbookHelper } from "../helpers/HandbookHelper";
import { InventoryHelper } from "../helpers/InventoryHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { PaymentHelper } from "../helpers/PaymentHelper";
import { TraderHelper } from "../helpers/TraderHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { Item } from "../models/eft/common/tables/IItem";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBuyTradeRequestData } from "../models/eft/trade/IProcessBuyTradeRequestData";
import { IProcessSellTradeRequestData } from "../models/eft/trade/IProcessSellTradeRequestData";
import { BackendErrorCodes } from "../models/enums/BackendErrorCodes";
import { ILogger } from "../models/spt/utils/ILogger";
import { DatabaseServer } from "../servers/DatabaseServer";
import { HttpResponseUtil } from "../utils/HttpResponseUtil";
import { LocalisationService } from "./LocalisationService";

@injectable()
export class PaymentService
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("HandbookHelper") protected handbookHelper: HandbookHelper,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("PaymentHelper") protected paymentHelper: PaymentHelper
    )
    { }

    /**
     * Take money and insert items into return to server request
     * @param {IPmcData} pmcData Player profile
     * @param {IProcessBuyTradeRequestData} request
     * @param {string} sessionID
     * @returns Object
     */
    public payMoney(pmcData: IPmcData, request: IProcessBuyTradeRequestData, sessionID: string, output: IItemEventRouterResponse):  IItemEventRouterResponse
    {
        const trader = this.traderHelper.getTrader(request.tid, sessionID);
        let currencyTpl = this.paymentHelper.getCurrency(trader.currency);

        // Delete barter items(not money) from inventory
        if (request.Action === "TradingConfirm")
        {
            for (const index in request.scheme_items)
            {
                const item = pmcData.Inventory.items.find(i => i._id === request.scheme_items[index].id);
                if (item !== undefined)
                {
                    if (!this.paymentHelper.isMoneyTpl(item._tpl))
                    {
                        output = this.inventoryHelper.removeItem(pmcData, item._id, sessionID, output);
                        request.scheme_items[index].count = 0;
                    }
                    else
                    {
                        currencyTpl = item._tpl;
                        break;
                    }
                }
            }
        }

        // prepare a price for barter
        let barterPrice = 0;
        barterPrice = request.scheme_items.reduce((accumulator, item) => accumulator + item.count, 0);

        // Nothing to do here, since we dont need to pay money.
        if (barterPrice === 0)
        {
            this.logger.success(this.localisationService.getText("payment-zero_price_no_payment"));
            return output;
        }

        output = this.addPaymentToOutput(pmcData, currencyTpl, barterPrice, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        // set current sale sum
        // convert barterPrice itemTpl into RUB then convert RUB into trader currency
        const saleSum = pmcData.TradersInfo[request.tid].salesSum += this.handbookHelper.fromRUB(this.handbookHelper.inRUB(barterPrice, currencyTpl), this.paymentHelper.getCurrency(trader.currency));

        pmcData.TradersInfo[request.tid].salesSum = saleSum;
        this.traderHelper.lvlUp(request.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [request.tid]: pmcData.TradersInfo[request.tid] });

        this.logger.debug("Items taken. Status OK.");
        return output;
    }

    /**
     * Receive money back after selling
     * @param {IPmcData} pmcData
     * @param {number} amount
     * @param {IProcessSellTradeRequestData} body
     * @param {IItemEventRouterResponse} output
     * @param {string} sessionID
     * @returns IItemEventRouterResponse
     */
    public getMoney(pmcData: IPmcData, amount: number, body: IProcessSellTradeRequestData, output: IItemEventRouterResponse, sessionID: string): IItemEventRouterResponse
    {
        const trader = this.traderHelper.getTrader(body.tid, sessionID);
        const currency = this.paymentHelper.getCurrency(trader.currency);
        let calcAmount = this.handbookHelper.fromRUB(this.handbookHelper.inRUB(amount, currency), currency);
        const maxStackSize = this.databaseServer.getTables().templates.items[currency]._props.StackMaxSize;
        let skip = false;

        for (const item of pmcData.Inventory.items)
        {
            // item is not currency
            if (item._tpl !== currency)
            {
                continue;
            }

            // item is not in the stash
            if (!this.isItemInStash(pmcData, item))
            {
                continue;
            }

            if (item.upd.StackObjectsCount < maxStackSize)
            {

                if (item.upd.StackObjectsCount + calcAmount > maxStackSize)
                {
                    // calculate difference
                    calcAmount -= maxStackSize - item.upd.StackObjectsCount;
                    item.upd.StackObjectsCount = maxStackSize;
                }
                else
                {
                    skip = true;
                    item.upd.StackObjectsCount = item.upd.StackObjectsCount + calcAmount;
                }

                output.profileChanges[sessionID].items.change.push(item);

                if (skip)
                {
                    break;
                }
            }
        }

        if (!skip)
        {
            const request = {
                items: [{
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    item_id: currency,
                    count: calcAmount
                }],
                tid: body.tid
            };

            output = this.inventoryHelper.addItem(pmcData, request, output, sessionID, null, false);
        }

        // set current sale sum
        const saleSum = pmcData.TradersInfo[body.tid].salesSum + amount;

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        this.traderHelper.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [body.tid]: { "salesSum": saleSum } });

        return output;
    }

    /**
   * Recursively checks if the given item is
   * inside the stash, that is it has the stash as
   * ancestor with slotId=hideout
   */
    protected isItemInStash(pmcData: IPmcData, item: Item): boolean
    {
        let container = item;
     
        while ("parentId" in container)
        {
            if (container.parentId === pmcData.Inventory.stash && container.slotId === "hideout")
            {
                return true;
            }
     
            container = pmcData.Inventory.items.find(i => i._id === container.parentId);
            if (!container)
            {
                break;
            }
        }
        return false;
    }

    /**
     * Remove currency from player stash/inventory
     * @param pmcData Player profile to find and remove currency from
     * @param currencyTpl Type of currency to pay
     * @param amountToPay money value to pay
     * @param sessionID Session id
     * @param output output object to send to client
     * @returns IItemEventRouterResponse
     */
    public addPaymentToOutput(pmcData: IPmcData, currencyTpl: string, amountToPay: number, sessionID: string, output: IItemEventRouterResponse): IItemEventRouterResponse
    {
        const moneyItemsInInventory = this.itemHelper.findBarterItems("tpl", pmcData, currencyTpl);

        // Move items in stash to top of array
        moneyItemsInInventory.sort((a, b) => this.prioritiseStashSort(a, b, pmcData.Inventory.items));

        const amountAvailable = moneyItemsInInventory.reduce((accumulator, item) => accumulator + item.upd.StackObjectsCount, 0);

        // if no money in inventory or amount is not enough we return false
        if (moneyItemsInInventory.length <= 0 || amountAvailable < amountToPay)
        {
            this.logger.error(this.localisationService.getText("payment-not_enough_money_to_complete_transation", {amountToPay: amountToPay, amountAvailable: amountAvailable}));
            output = this.httpResponse.appendErrorToOutput(output, this.localisationService.getText("payment-not_enough_money_to_complete_transation_short"), BackendErrorCodes.UNKNOWN_TRADING_ERROR);

            return output;
        }

        let leftToPay = amountToPay;
        for (const moneyItem of moneyItemsInInventory)
        {
            const itemAmount = moneyItem.upd.StackObjectsCount;
            if (leftToPay >= itemAmount)
            {
                leftToPay -= itemAmount;
                output = this.inventoryHelper.removeItem(pmcData, moneyItem._id, sessionID, output);
            }
            else
            {
                moneyItem.upd.StackObjectsCount -= leftToPay;
                leftToPay = 0;
                output.profileChanges[sessionID].items.change.push(moneyItem);
            }

            if (leftToPay === 0)
            {
                break;
            }
        }

        return output;
    }

    /**
     * Prioritise player stash first over player inventory
     * Post-raid healing would often take money out of the players pockets/secure container
     * @param a First money stack item
     * @param b Second money stack item
     * @param inventoryItems players inventory items
     * @returns sort order
     */
    protected prioritiseStashSort(a: Item, b: Item, inventoryItems: Item[]): number
    {
        // a is stash, prioritise
        if (a.slotId === "hideout" && b.slotId !== "hideout")
        {
            return -1;
        }

        // b is stash, prioritise
        if (a.slotId !== "hideout" && b.slotId === "hideout")
        {
            return 1;
        }

        // both in containers
        if (a.slotId === "main" && b.slotId === "main")
        {
            // Item is in inventory, not stash, deprioritise
            const aIsInInventory = this.isInInventory(a.parentId, inventoryItems);
            const bIsInInventory = this.isInInventory(b.parentId, inventoryItems);

            // Lower a as its in inventory, not stash
            if (!aIsInInventory && bIsInInventory)
            {
                return -1;
            }

            // Raise a as its in stash, not inventory
            if (aIsInInventory && !bIsInInventory)
            {
                return 1;
            }
        }

        // they match
        return 0;
    }

    /**
     * Recursivly check items parents to see if it is inside the players inventory, not stash
     * @param itemId item id to check
     * @param inventoryItems player inventory
     * @returns true if its in inventory
     */
    protected isInInventory(itemId: string, inventoryItems: Item[]): boolean
    {
        const itemParent = inventoryItems.find(x => x._id === itemId);
        if (itemParent)
        {
            if (itemParent._id === "5fe49a0e2694b0755a50476c") // Default inventory tpl
            {
                return true;
            }

            return this.isInInventory(itemParent.parentId, inventoryItems);
        }

        return false;
    }
}