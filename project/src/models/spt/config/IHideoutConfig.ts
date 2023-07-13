import { IBaseConfig } from "./IBaseConfig";

export interface IHideoutConfig extends IBaseConfig
{
    kind: "aki-hideout"
    runIntervalSeconds: number
    hoursForSkillCrafting: number
    hideoutWallAppearTimeSeconds: number
    expCraftAmount: number;
}