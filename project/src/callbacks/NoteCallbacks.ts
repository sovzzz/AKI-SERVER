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

    /** Handle AddNote event */
    public addNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.addNote(pmcData, body, sessionID);
    }

    /** Handle EditNote event */
    public editNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.editNote(pmcData, body, sessionID);
    }

    /** Handle DeleteNote event */
    public deleteNote(pmcData: IPmcData, body: INoteActionData, sessionID: string): IItemEventRouterResponse
    {
        return this.noteController.deleteNote(pmcData, body, sessionID);
    }
}
