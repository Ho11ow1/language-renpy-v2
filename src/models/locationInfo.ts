export class LocationInfo
{
    public readonly filePath: string;
    public readonly lineNumber: number;

    public constructor(filePath: string, lineNumber: number)
    {
        this.filePath = filePath;
        this.lineNumber = lineNumber;
    }
}
