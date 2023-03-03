import { inject, injectable } from "tsyringe";

import { HandbookController } from "../controllers/HandbookController";
import { OnLoad } from "../di/OnLoad";

@injectable()
export class HandbookCallbacks implements OnLoad
{
    constructor(
        @inject("HandbookController") protected handbookController: HandbookController
    )
    {
    }
    public async onLoad(): Promise<void> 
    {
        this.handbookController.load();
    }
    public getRoute(): string 
    {
        return "aki-handbook";
    }
}