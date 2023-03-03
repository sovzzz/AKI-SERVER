import { MinMax } from "../../models/common/MinMax";
import { Inventory } from "../../models/eft/common/tables/IBotBase";
import { ITemplateItem } from "../../models/eft/common/tables/ITemplateItem";

export class InventoryMagGen 
{
    constructor(
        private magCounts: MinMax,
        private magazineTemplate: ITemplateItem,
        private weaponTemplate: ITemplateItem,
        private ammoTemplate: ITemplateItem,
        private pmcInventory: Inventory
    ) 
    {
    }

    public getMagCount(): MinMax 
    {
        return this.magCounts;
    }

    public getMagazineTemplate(): ITemplateItem 
    {
        return this.magazineTemplate;
    }

    public getWeaponTemplate(): ITemplateItem 
    {
        return this.weaponTemplate;
    }

    public getAmmoTemplate(): ITemplateItem 
    {
        return this.ammoTemplate;
    }

    public getPmcInventory(): Inventory 
    {
        return this.pmcInventory;
    }
}