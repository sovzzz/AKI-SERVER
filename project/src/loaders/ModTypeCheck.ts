import { injectable } from "tsyringe";
import { IPostAkiLoadMod } from "../models/external/IPostAkiLoadMod";
import { IPostAkiLoadModAsync } from "../models/external/IPostAkiLoadModAsync";
import { IPostDBLoadMod } from "../models/external/IPostDBLoadMod";
import { IPostDBLoadModAsync } from "../models/external/IPostDBLoadModAsync";
import { IPreAkiLoadMod } from "../models/external/IPreAkiLoadMod";
import { IPreAkiLoadModAsync } from "../models/external/IPreAkiLoadModAsync";

@injectable()
export class ModTypeCheck
{

    /**
     * Use defined safe guard to check if the mod is a IPreAkiLoadMod
     * @returns boolean
     */
    public isPreAkiLoad(mod: any): mod is IPreAkiLoadMod
    {
        return mod?.preAkiLoad;
    }
    
    /**
     * Use defined safe guard to check if the mod is a IPostAkiLoadMod
     * @returns boolean
     */
    public isPostAkiLoad(mod: any): mod is IPostAkiLoadMod
    {
        return mod?.postAkiLoad;
    }
    
    /**
     * Use defined safe guard to check if the mod is a IPostDBLoadMod
     * @returns boolean
     */
    public isPostDBAkiLoad(mod: any): mod is IPostDBLoadMod
    {
        return mod?.postDBLoad;
    }

    /**
     * Use defined safe guard to check if the mod is a IPreAkiLoadModAsync
     * @returns boolean
     */
    public isPreAkiLoadAsync(mod: any): mod is IPreAkiLoadModAsync
    {
        return mod?.preAkiLoadAsync;
    }
        
    /**
     * Use defined safe guard to check if the mod is a IPostAkiLoadModAsync
     * @returns boolean
     */
    public isPostAkiLoadAsync(mod: any): mod is IPostAkiLoadModAsync
    {
        return mod?.postAkiLoadAsync;
    }
        
    /**
     * Use defined safe guard to check if the mod is a IPostDBLoadModAsync
     * @returns boolean
     */
    public isPostDBAkiLoadAsync(mod: any): mod is IPostDBLoadModAsync
    {
        return mod?.postDBLoadAsync;
    }

    /**
     * Checks for mod to be compatible with 3.X+
     * @returns boolean
     */
    public isPostV3Compatible(mod: any): boolean
    {
        return this.isPreAkiLoad(mod) || 
            this.isPostAkiLoad(mod) || 
            this.isPostDBAkiLoad(mod) ||
            this.isPreAkiLoadAsync(mod) ||
            this.isPostAkiLoadAsync(mod) ||
            this.isPostDBAkiLoadAsync(mod);

    }
}