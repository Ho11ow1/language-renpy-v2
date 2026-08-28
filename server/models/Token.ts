import * as Models from "@server/models/index";
import * as lsps from "vscode-languageserver/node";

export class Token
{
    public Type: Models.TokenType;
    public Value: string;
    public Range: lsps.Range;

    public constructor(type: Models.TokenType, value: string, range: lsps.Range)
    {
        this.Type = type;
        this.Value = value;
        this.Range = range;
    }

    public toString(): string
    {
        return `${this.Type} ${this.Value} (${this.Range.start.line},${this.Range.start.character} | ${this.Range.end.line},${this.Range.end.character})`;
    }
}
