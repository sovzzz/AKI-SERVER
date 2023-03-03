import { inject, injectable } from "tsyringe";

import { NoteController } from "../controllers/NoteController";
import { IPmcData } from "../models/eft/common/IPmcData";
import { IItemEventRouterResponse } from "../models/eft/itemEvent/IItemEventRouterResponse";
import { INoteActionData } from "../models/eft/notes/INoteActionData";

@injectable()
export class NoteCallbacks
{
    constructor(
        @inject("NoteController") protected noteController: NoteController)
    { }

    public addNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.addNote(pmcData, body, sessionID);
    }

    public editNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.editNote(pmcData, body, sessionID);
    }

    public deleteNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.deleteNote(pmcData, body, sessionID);
    }
}
