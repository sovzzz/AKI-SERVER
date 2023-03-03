import { inject, injectable } from "tsyringe";

import { BotWeaponGeneratorHelper } from "../../../helpers/BotWeaponGeneratorHelper";
import { BaseClasses } from "../../../models/enums/BaseClasses";
import { EquipmentSlots } from "../../../models/enums/EquipmentSlots";
import { IInventoryMagGen } from "../IInventoryMagGen";
import { InventoryMagGen } from "../InventoryMagGen";

@injectable()
export class UbglExternalMagGen implements IInventoryMagGen
{

    constructor(
        @inject("BotWeaponGeneratorHelper") protected botWeaponGeneratorHelper: BotWeaponGeneratorHelper
    )
    { }

    public getPriority(): number 
    {
        return 1;
    }

    public canHandleInventoryMagGen(inventoryMagGen: InventoryMagGen): boolean 
    {
        return inventoryMagGen.getWeaponTemplate()._parent === BaseClasses.UBGL;
    }

    public process(inventoryMagGen: InventoryMagGen): void 
    {
        const bulletCount = this.botWeaponGeneratorHelper.getRandomizedBulletCount(inventoryMagGen.getMagCount(), inventoryMagGen.getMagazineTemplate());
        this.botWeaponGeneratorHelper.addAmmoIntoEquipmentSlots(inventoryMagGen.getAmmoTemplate()._id, bulletCount, inventoryMagGen.getPmcInventory(), [EquipmentSlots.TACTICAL_VEST]);
    }
}