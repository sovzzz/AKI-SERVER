import { injectable } from "tsyringe";

export class FindSlotResult
{
    success: boolean;
    x: any;
    y: any;
    rotation: boolean;
    constructor(success = false, x = null, y = null, rotation = false)
    {
        this.success = success;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
    }
}

@injectable()
export class ContainerHelper
{
    protected locateSlot(container2D: number[][], containerX: number, containerY: number, x: number, y: number, itemW: number, itemH: number): boolean
    {
        let foundSlot = true;

        for (let itemY = 0; itemY < itemH; itemY++)
        {
            if (foundSlot && y + itemH - 1 > containerY - 1)
            {
                foundSlot = false;
                break;
            }

            for (let itemX = 0; itemX < itemW; itemX++)
            {
                if (foundSlot && x + itemW - 1 > containerX - 1)
                {
                    foundSlot = false;
                    break;
                }

                if (container2D[y + itemY][x + itemX] !== 0)
                {
                    foundSlot = false;
                    break;
                }
            }

            if (!foundSlot)
            {
                break;
            }
        }

        return foundSlot;
    }

    /* Finds a slot for an item in a given 2D container map
     * Output: { success: boolean, x: number, y: number, rotation: boolean }
     */
    public findSlotForItem(container2D: number[][], itemWidth: number, itemHeight: number): FindSlotResult
    {
        let rotation = false;
        const minVolume = (itemWidth < itemHeight ? itemWidth : itemHeight) - 1;
        const containerY = container2D.length;
        const containerX = container2D[0].length;
        const limitY = containerY - minVolume;
        const limitX = containerX - minVolume;

        for (let y = 0; y < limitY; y++)
        {
            for (let x = 0; x < limitX; x++)
            {
                let foundSlot = this.locateSlot(container2D, containerX, containerY, x, y, itemWidth, itemHeight);

                /**
                 * Try to rotate if there is enough room for the item
                 * Only occupies one grid of items, no rotation required
                 * */
                if (!foundSlot && itemWidth * itemHeight > 1)
                {
                    foundSlot = this.locateSlot(container2D, containerX, containerY, x, y, itemHeight, itemWidth);

                    if (foundSlot)
                    {
                        rotation = true;
                    }
                }

                if (!foundSlot)
                {
                    continue;
                }

                return new FindSlotResult(true, x, y, rotation);
            }
        }

        return new FindSlotResult();
    }

    public fillContainerMapWithItem(container2D: number[][], x: number, y: number, itemW: number, itemH: number, rotate: boolean): any
    {
        const itemWidth = rotate ? itemH : itemW;
        const itemHeight = rotate ? itemW : itemH;

        for (let tmpY = y; tmpY < y + itemHeight; tmpY++)
        {
            for (let tmpX = x; tmpX < x + itemWidth; tmpX++)
            {
                if (container2D[tmpY][tmpX] === 0)
                {
                    container2D[tmpY][tmpX] = 1;
                }
                else
                {
                    throw `Slot at (${x}, ${y}) is already filled`;
                }
            }
        }

        return container2D;
    }
}