import { inject, injectable } from "tsyringe";

import { HandbookHelper } from "../helpers/HandbookHelper";
import { DatabaseServer } from "../servers/DatabaseServer";

@injectable()
export class HandbookController
{
    constructor(
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("HandbookHelper") protected handbookHelper: HandbookHelper
    )
    { }

    public load(): void
    {
        return;
    }
}