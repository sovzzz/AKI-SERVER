import { inject, injectable } from "tsyringe";

import { DialogueHelper } from "../helpers/DialogueHelper";
import { ItemHelper } from "../helpers/ItemHelper";
import { ProfileHelper } from "../helpers/ProfileHelper";
import { IPmcData } from "../models/eft/common/IPmcData";
import { Item } from "../models/eft/common/tables/IItem";
import { IGetInsuranceCostRequestData } from "../models/eft/insurance/IGetInsuranceCostRequestData";
import {
    IGetInsuranceCostResponseData
} from "../models/eft/insurance/IGetInsuranceCostResponseData";
import { IInsureRequestData } from "../models/eft/insurance/IInsureRequestData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { IProcessBuyTradeRequestData } from "../models/eft/trade/IProcessBuyTradeRequestData";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IInsuranceConfig } from "../models/spt/config/IInsuranceConfig";
import { ILogger } from "../models/spt/utils/ILogger";
import { EventOutputHolder } from "../routers/EventOutputHolder";
import { ConfigServer } from "../servers/ConfigServer";
import { DatabaseServer } from "../servers/DatabaseServer";
import { SaveServer } from "../servers/SaveServer";
import { InsuranceService } from "../services/InsuranceService";
import { PaymentService } from "../services/PaymentService";
import { RandomUtil } from "../utils/RandomUtil";
import { TimeUtil } from "../utils/TimeUtil";

@injectable()
export class InsuranceController
{
    protected insuranceConfig: IInsuranceConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("SaveServer") protected saveServer: SaveServer,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("DialogueHelper") protected dialogueHelper: DialogueHelper,
        @inject("PaymentService") protected paymentService: PaymentService,
        @inject("InsuranceService") protected insuranceService: InsuranceService,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.insuranceConfig = this.configServer.getConfig(ConfigTypes.INSURANCE);
    }

    /**
     * Process insurance items prior to being given to player in mail
     */
    public processReturn(): void
    {
        const time = this.timeUtil.getTimestamp();

        for (const sessionID in this.saveServer.getProfiles())
        {
            const insurance = this.saveServer.getProfile(sessionID).insurance;
            let i = insurance.length;

            // Skip profile with no insurance items
            if (i === 0)
            {
                continue;
            }

            while (i-- > 0)
            {
                const insured = insurance[i];
                const traderReturnChance = this.insuranceConfig.returnChancePercent[insured.traderId];

                // Return time not reached, skip
                if (time < insured.scheduledTime)
                {
                    continue;
                }

                // Gather up items that can fail
                const slotIdsThatCanFail = this.insuranceConfig.slotIdsWithChanceOfNotReturning;
                const toDelete = [];

                // Loop over insurance items
                for (const insuredItem of insured.items)
                {
                    // Roll from 0 to 9999, then divide it by 100: 9999 =  99.99%
                    const returnChance = this.randomUtil.getInt(0, 9999) / 100;
                    if ((slotIdsThatCanFail.includes(insuredItem.slotId)) && returnChance >= traderReturnChance && !toDelete.includes(insuredItem._id))
                    {
                        // Skip if not an item
                        const itemDetails = this.itemHelper.getItem(insuredItem._tpl);
                        if (!itemDetails[0])
                        {
                            continue;
                        }

                        // Is a mod and can't be edited in-raid
                        if (insuredItem.slotId !== "hideout" && !itemDetails[1]._props.RaidModdable)
                        {
                            continue;
                        }

                        // Remove item and its sub-items to prevent orphaned items
                        toDelete.push(...this.itemHelper.findAndReturnChildrenByItems(insured.items, insuredItem._id));
                    }
                }

                for (let index = insured.items.length - 1; index >= 0; --index)
                {
                    if (toDelete.includes(insured.items[index]._id))
                    {
                        insured.items.splice(index, 1);
                    }
                }

                // No items to return as they all failed the above check, adjust insurance mail template
                if (insured.items.length === 0)
                {
                    const insuranceFailedTemplates = this.databaseServer.getTables().traders[insured.traderId].dialogue.insuranceFailed;
                    insured.messageContent.templateId = this.randomUtil.getArrayValue(insuranceFailedTemplates);
                }

                this.dialogueHelper.addDialogueMessage(insured.traderId, insured.messageContent, sessionID, insured.items);

                // Remove insurance package from profile now we've processed it
                insurance.splice(i, 1);
            }

            this.saveServer.getProfile(sessionID).insurance = insurance;
        }
    }

    /**
     * Add insurance to an item
     * @param pmcData Player profile
     * @param body Insurance request
     * @param sessionID Session id
     * @returns IItemEventRouterResponse object to send to client
     */
    public insure(pmcData: IPmcData, body: IInsureRequestData, sessionID: string): IItemEventRouterResponse
    {
        let output = this.eventOutputHolder.getOutput(sessionID);
        const itemsToPay = [];
        const inventoryItemsHash = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        // get the price of all items
        for (const key of body.items)
        {
            itemsToPay.push({
                id: inventoryItemsHash[key]._id,
                count: Math.round(this.insuranceService.getPremium(pmcData, inventoryItemsHash[key], body.tid))
            });
        }

        const options: IProcessBuyTradeRequestData = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            scheme_items: itemsToPay,
            tid: body.tid,
            Action: "",
            type: "",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            item_id: "",
            count: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            scheme_id: 0
        };

        // pay for the item insurance
        output = this.paymentService.payMoney(pmcData, options, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        // add items to InsuredItems list once money has been paid
        for (const key of body.items)
        {
            pmcData.InsuredItems.push({
                tid: body.tid,
                itemId: inventoryItemsHash[key]._id
            });
        }

        return output;
    }

    /**
     * Calculate insurance cost
     * @param info request object
     * @param sessionID session id
     * @returns IGetInsuranceCostResponseData object to send to client
     */
    public cost(info: IGetInsuranceCostRequestData, sessionID: string): IGetInsuranceCostResponseData
    {
        const output: IGetInsuranceCostResponseData = {};
        const pmcData = this.profileHelper.getPmcProfile(sessionID);
        const inventoryItemsHash: Record<string, Item> = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        for (const trader of info.traders)
        {
            const items = {};

            for (const key of info.items)
            {
                items[inventoryItemsHash[key]._tpl] = Math.round(this.insuranceService.getPremium(pmcData, inventoryItemsHash[key], trader));
            }

            output[trader] = items;
        }

        return output;
    }
}
