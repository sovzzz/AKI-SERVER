import { inject, injectable } from "tsyringe";

import { InventoryController } from "../controllers/InventoryController";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IInventoryBindRequestData } from "../models/eft/inventory/IInventoryBindRequestData";
import {
    IInventoryCreateMarkerRequestData
} from "../models/eft/inventory/IInventoryCreateMarkerRequestData";
import {
    IInventoryDeleteMarkerRequestData
} from "../models/eft/inventory/IInventoryDeleteMarkerRequestData";
import {
    IInventoryEditMarkerRequestData
} from "../models/eft/inventory/IInventoryEditMarkerRequestData";
import { IInventoryExamineRequestData } from "../models/eft/inventory/IInventoryExamineRequestData";
import { IInventoryFoldRequestData } from "../models/eft/inventory/IInventoryFoldRequestData";
import { IInventoryMergeRequestData } from "../models/eft/inventory/IInventoryMergeRequestData";
import { IInventoryMoveRequestData } from "../models/eft/inventory/IInventoryMoveRequestData";
import {
    IInventoryReadEncyclopediaRequestData
} from "../models/eft/inventory/IInventoryReadEncyclopediaRequestData";
import { IInventoryRemoveRequestData } from "../models/eft/inventory/IInventoryRemoveRequestData";
import { IInventorySortRequestData } from "../models/eft/inventory/IInventorySortRequestData";
import { IInventorySplitRequestData } from "../models/eft/inventory/IInventorySplitRequestData";
import { IInventorySwapRequestData } from "../models/eft/inventory/IInventorySwapRequestData";
import { IInventoryTagRequestData } from "../models/eft/inventory/IInventoryTagRequestData";
import { IInventoryToggleRequestData } from "../models/eft/inventory/IInventoryToggleRequestData";
import {
    IInventoryTransferRequestData
} from "../models/eft/inventory/IInventoryTransferRequestData";
import {
    IOpenRandomLootContainerRequestData
} from "../models/eft/inventory/IOpenRandomLootContainerRequestData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";

@injectable()
export class InventoryCallbacks
{
    constructor(
        @inject("InventoryController") protected inventoryController: InventoryController
    )
    { }

    public moveItem(pmcData: IPmcData, body: IInventoryMoveRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.moveItem(pmcData, body, sessionID);
    }

    public removeItem(pmcData: IPmcData, body: IInventoryRemoveRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.discardItem(pmcData, body, sessionID);
    }

    public splitItem(pmcData: IPmcData, body: IInventorySplitRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.splitItem(pmcData, body, sessionID);
    }

    public mergeItem(pmcData: IPmcData, body: IInventoryMergeRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.mergeItem(pmcData, body, sessionID);
    }

    public transferItem(pmcData: IPmcData, body: IInventoryTransferRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.transferItem(pmcData, body, sessionID);
    }

    // TODO: how is this triggered
    public swapItem(pmcData: IPmcData, body: IInventorySwapRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.swapItem(pmcData, body, sessionID);
    }

    public foldItem(pmcData: IPmcData, body: IInventoryFoldRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.foldItem(pmcData, body, sessionID);
    }

    public toggleItem(pmcData: IPmcData, body: IInventoryToggleRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.toggleItem(pmcData, body, sessionID);
    }

    public tagItem(pmcData: IPmcData, body: IInventoryTagRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.tagItem(pmcData, body, sessionID);
    }

    public bindItem(pmcData: IPmcData, body: IInventoryBindRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.bindItem(pmcData, body, sessionID);
    }

    public examineItem(pmcData: IPmcData, body: IInventoryExamineRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.examineItem(pmcData, body, sessionID);
    }

    public readEncyclopedia(pmcData: IPmcData, body: IInventoryReadEncyclopediaRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.readEncyclopedia(pmcData, body, sessionID);
    }

    public sortInventory(pmcData: IPmcData, body: IInventorySortRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.sortInventory(pmcData, body, sessionID);
    }

    public createMapMarker(pmcData: IPmcData, body: IInventoryCreateMarkerRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.createMapMarker(pmcData, body, sessionID);
    }

    public deleteMapMarker(pmcData: IPmcData, body: IInventoryDeleteMarkerRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.deleteMapMarker(pmcData, body, sessionID);
    }

    public editMapMarker(pmcData: IPmcData, body: IInventoryEditMarkerRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.editMapMarker(pmcData, body, sessionID);
    }

    public openRandomLootContainer(pmcData: IPmcData, body: IOpenRandomLootContainerRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.openRandomLootContainer(pmcData, body, sessionID);
    }
}