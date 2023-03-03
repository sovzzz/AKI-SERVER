import { injectable } from "tsyringe";

@injectable()
export class HttpBufferHandler
{

    protected buffers = {};

    public resetBuffer(sessionID: string): void
    {
        this.buffers[sessionID] = undefined;
    }

    public putInBuffer(sessionID: any, data: any, bufLength: number): boolean
    {
        if (this.buffers[sessionID] === undefined || this.buffers[sessionID].allocated !== bufLength)
        {
            this.buffers[sessionID] = {
                written: 0,
                allocated: bufLength,
                buffer: Buffer.alloc(bufLength)
            };
        }

        const buf = this.buffers[sessionID];

        data.copy(buf.buffer, buf.written, 0);
        buf.written += data.length;
        return buf.written === buf.allocated;
    }

    public getFromBuffer(sessionID: string): any
    {
        return this.buffers[sessionID].buffer;
    }
}