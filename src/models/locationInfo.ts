export class LocationInfo
{
    public readonly filePath: string;
    public readonly lineNumber: number;
    public readonly lineEndLen: number;

    public constructor(filePath: string, lineNumber: number, lineEndLen: number)
    {
        this.filePath = filePath;
        this.lineNumber = lineNumber;
        this.lineEndLen = lineEndLen;
    }
}
