import { inject, injectable } from "tsyringe";

import { ITemplateItem } from "../models/eft/common/tables/ITemplateItem";
import { ConfigTypes } from "../models/enums/ConfigTypes";
import { IBotConfig } from "../models/spt/config/IBotConfig";
import { ConfigServer } from "../servers/ConfigServer";
import { RandomUtil } from "../utils/RandomUtil";
import { BotHelper } from "./BotHelper";

@injectable()
export class DurabilityLimitsHelper
{
    protected botConfig: IBotConfig;

    constructor(
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("BotHelper") protected botHelper: BotHelper,
        @inject("ConfigServer") protected configServer: ConfigServer
    )
    {
        this.botConfig = this.configServer.getConfig(ConfigTypes.BOT);
    }

    public getRandomizedMaxWeaponDurability(itemTemplate: ITemplateItem, botRole: string): number
    {
        if (botRole && this.botHelper.isBotPmc(botRole))
        {
            return this.generateMaxWeaponDurability("pmc");
        }

        if (botRole && this.botHelper.isBotBoss(botRole))
        {
            return this.generateMaxWeaponDurability("boss");
        }

        if (botRole && this.botHelper.isBotFollower(botRole))
        {
            return this.generateMaxWeaponDurability("follower");
        }

        return this.generateMaxWeaponDurability(botRole);
    }

    public getRandomizedMaxArmorDurability(itemTemplate: ITemplateItem, botRole: string): number
    {
        const itemMaxDurability = itemTemplate._props.MaxDurability;

        if (botRole && this.botHelper.isBotPmc(botRole))
        {
            return this.generateMaxPmcArmorDurability(itemMaxDurability);
        }

        if (botRole && this.botHelper.isBotBoss(botRole))
        {
            return itemMaxDurability;
        }

        if (botRole && this.botHelper.isBotFollower(botRole))
        {
            return itemMaxDurability;
        }

        return itemMaxDurability;
    }

    public getRandomizedWeaponDurability(itemTemplate: ITemplateItem, botRole: string, maxDurability: number): number
    {
        if (botRole && (this.botHelper.isBotPmc(botRole)))
        {
            return this.generateWeaponDurability("pmc", maxDurability);
        }

        if (botRole && this.botHelper.isBotBoss(botRole))
        {
            return this.generateWeaponDurability("boss", maxDurability);
        }

        if (botRole && this.botHelper.isBotFollower(botRole))
        {
            return this.generateWeaponDurability("follower", maxDurability);
        }

        return this.generateWeaponDurability(botRole, maxDurability);
    }

    public getRandomizedArmorDurability(itemTemplate: ITemplateItem, botRole: string, maxDurability: number): number
    {
        if (botRole && (this.botHelper.isBotPmc(botRole)))
        {
            return this.generateArmorDurability("pmc", maxDurability);
        }

        if (botRole && this.botHelper.isBotBoss(botRole))
        {
            return this.generateArmorDurability("boss", maxDurability);
        }

        if (botRole && this.botHelper.isBotFollower(botRole))
        {
            return this.generateArmorDurability("follower", maxDurability);
        }

        return this.generateArmorDurability(botRole, maxDurability);
    }

    protected generateMaxWeaponDurability(botRole: string): number
    {
        const lowestMax = this.getLowestMaxWeaponFromConfig(botRole);
        const highestMax = this.getHighestMaxWeaponDurabilityFromConfig(botRole);

        return this.randomUtil.getInt(lowestMax, highestMax);
    }

    protected generateMaxPmcArmorDurability(itemMaxDurability: number): number
    {
        const lowestMaxPercent = this.botConfig.durability["pmc"].armor.lowestMaxPercent;
        const highestMaxPercent = this.botConfig.durability["pmc"].armor.highestMaxPercent;
        const multiplier = this.randomUtil.getInt(lowestMaxPercent, highestMaxPercent);

        return itemMaxDurability * (multiplier / 100);
    }

    protected getLowestMaxWeaponFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].weapon.lowestMax;
        }

        return this.botConfig.durability.default.weapon.lowestMax;
    }

    protected getHighestMaxWeaponDurabilityFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].weapon.highestMax;
        }

        return this.botConfig.durability.default.weapon.highestMax;
    }

    protected generateWeaponDurability(botRole: string, maxDurability: number): number
    {
        const minDelta = this.getMinWeaponDeltaFromConfig(botRole);
        const maxDelta = this.getMaxWeaponDeltaFromConfig(botRole);
        const delta = this.randomUtil.getInt(minDelta, maxDelta);
        const result = maxDurability - delta;
        const durabilityValueMinLimit = Math.round((this.getMinWeaponLimitPercentFromConfig(botRole) / 100) * maxDurability);

        // Dont let weapon dura go below the percent defined in config
        return (result >= durabilityValueMinLimit)
            ? result
            : durabilityValueMinLimit;
    }

    protected generateArmorDurability(botRole: string, maxDurability: number): number
    {
        const minDelta = this.getMinArmorDeltaFromConfig(botRole);
        const maxDelta = this.getMaxArmorDeltaFromConfig(botRole);
        const delta = this.randomUtil.getInt(minDelta, maxDelta);
        const result = maxDurability - delta;
        const durabilityValueMinLimit = Math.round((this.getMinArmorLimitPercentFromConfig(botRole) / 100) * maxDurability);

        // Dont let armor dura go below the percent defined in config
        return (result >= durabilityValueMinLimit)
            ? result
            : durabilityValueMinLimit;
    }

    protected getMinWeaponDeltaFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].weapon.minDelta;
        }

        return this.botConfig.durability.default.weapon.minDelta;
    }

    protected getMaxWeaponDeltaFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].weapon.maxDelta;
        }

        return this.botConfig.durability.default.weapon.maxDelta;
    }

    protected getMinArmorDeltaFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].armor.minDelta;
        }

        return this.botConfig.durability.default.armor.minDelta;
    }

    protected getMaxArmorDeltaFromConfig(botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].armor.maxDelta;
        }

        return this.botConfig.durability.default.armor.maxDelta;
    }

    protected getMinArmorLimitPercentFromConfig (botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].armor.minLimitPercent;
        }

        return this.botConfig.durability.default.armor.minLimitPercent;
    }

    protected getMinWeaponLimitPercentFromConfig (botRole: string): number
    {
        if (this.botConfig.durability[botRole])
        {
            return this.botConfig.durability[botRole].weapon.minLimitPercent;
        }

        return this.botConfig.durability.default.weapon.minLimitPercent;
    }
}