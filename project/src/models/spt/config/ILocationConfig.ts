import { MinMax } from "../../../models/common/MinMax";
import { BossLocationSpawn, Wave } from "../../../models/eft/common/ILocationBase";
import { IBaseConfig } from "./IBaseConfig";

export interface ILocationConfig extends IBaseConfig
{
    kind: "aki-location"
    /** Waves with a min/max of the same value don't spawn any bots, bsg only spawn the difference between min and max */
    fixEmptyBotWavesSettings: IFixEmptyBotWavesSettings;
    /** Rogues are classified as bosses and spawn immediatly, this can result in no scavs spawning, delay rogues spawning to allow scavs to spawn first */
    rogueLighthouseSpawnTimeSettings: IRogueLighthouseSpawnTimeSettings
    /** When a map has hit max alive bots, any wave that should spawn will be reduced to 1 bot in size and placed in a spawn queue, this splits waves into smaller sizes to reduce the impact of this behaviour */
    splitWaveIntoSingleSpawnsSettings: ISplitWaveSettings
    looseLootMultiplier: LootMultiplier
    staticLootMultiplier: LootMultiplier
    /** Custom bot waves to add to a locations base json on game start if addCustomBotWavesToMaps is true */
    customWaves: CustomWaves
    /** Open zones to add to map */
    openZones: Record<string, string[]>
    /** Key = map id, value = item tpls that should only have one forced loot spawn position */
    forcedLootSingleSpawnById: Record<string, string[]>
    /** How many attempts should be taken to fit an item into a container before giving up */
    fitLootIntoContainerAttempts: number;
    /** Add all possible zones to each maps `OpenZones` property */
    addOpenZonesToAllMaps: boolean
    /** Allow addition of custom bot waves designed by SPT to be added to maps - defined in  configs/location.json.customWaves*/
    addCustomBotWavesToMaps: boolean
    /** Should the limits defined inside botTypeLimits to appled to locations on game start */
    enableBotTypeLimits: boolean
    /** Add limits to a locations base.MinMaxBots array if enableBotTypeLimits is true*/
    botTypeLimits: Record<string, IBotTypeLimit[]>
}

export interface IFixEmptyBotWavesSettings
{
    enabled: boolean,
    ignoreMaps: string[];
}

export interface IRogueLighthouseSpawnTimeSettings
{
    enabled: boolean
    waitTimeSeconds: number
}

export interface ISplitWaveSettings
{
    enabled: boolean
    ignoreMaps: string[];
    waveSizeThreshold: number
}

export interface CustomWaves
{
    /** Bosses spawn on raid start */
    boss: Record<string, BossLocationSpawn[]>
    normal: Record<string, Wave[]>
}

export interface IBotTypeLimit extends MinMax
{
    type: string
}

/** Multiplier to apply to the loot count for a given map */
export interface LootMultiplier 
{
    bigmap: number
    develop: number
    // eslint-disable-next-line @typescript-eslint/naming-convention
    factory4_day: number
    // eslint-disable-next-line @typescript-eslint/naming-convention
    factory4_night: number
    interchange: number
    laboratory: number
    rezervbase: number
    shoreline: number
    woods: number
    hideout: number
    lighthouse: number
    privatearea: number
    suburbs: number
    tarkovstreets: number
    terminal: number
    town: number
}
