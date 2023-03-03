import { inject, injectable } from "tsyringe";
import { Item } from "../models/eft/common/tables/IItem";
import { ItemHelper } from "./ItemHelper";

export interface OwnerInventoryItems
{
    from: Item[]
    to: Item[]
    sameInventory: boolean,
    isMail: boolean
}

@injectable()
export class SecureContainerHelper
{

    constructor(
        @inject("ItemHelper") protected itemHelper: ItemHelper
    )
    { }

    public getSecureContainerItems(items: Item[]): string[]
    {
        const secureContainer = items.find(x => x.slotId === "SecuredContainer");

        // No container found, drop out
        if (!secureContainer)
        {
            return [];
        }

        const itemsInSecureContainer = this.itemHelper.findAndReturnChildrenByItems(items, secureContainer._id);

        // Return all items returned and exclude the secure container item itself
        return itemsInSecureContainer.filter(x => x !== secureContainer._id);
    }
}
