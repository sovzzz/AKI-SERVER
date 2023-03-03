import { inject, injectable } from "tsyringe";

import { BotWeaponGeneratorHelper } from "../../../helpers/BotWeaponGeneratorHelper";
import { IInventoryMagGen } from "../IInventoryMagGen";
import { InventoryMagGen } from "../InventoryMagGen";

@injectable()
export class InternalMagazineInventoryMagGen implements IInventoryMagGen
{

    constructor(
        @inject("BotWeaponGeneratorHelper") protected botWeaponGeneratorHelper: BotWeaponGeneratorHelper
    )
    { }

    public getPriority(): number 
    {
        return 0;
    }

    public canHandleInventoryMagGen(inventoryMagGen: InventoryMagGen): boolean 
    {
        return inventoryMagGen.getMagazineTemplate()._props.ReloadMagType === "InternalMagazine";
    }

    public process(inventoryMagGen: InventoryMagGen): void 
    {
        const bulletCount = this.botWeaponGeneratorHelper.getRandomizedBulletCount(inventoryMagGen.getMagCount(), inventoryMagGen.getMagazineTemplate());
        this.botWeaponGeneratorHelper.addAmmoIntoEquipmentSlots(inventoryMagGen.getAmmoTemplate()._id, bulletCount, inventoryMagGen.getPmcInventory());
    }
}