export interface IJoinMatchResult
{
    profileid: string
    status: string
    sid: string
    ip: string
    port: number
    version: string
    location: string
    raidMode: string
    mode: string
    shortid: string
    // eslint-disable-next-line @typescript-eslint/naming-convention
    additional_info: any[]
}