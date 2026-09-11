import * as lsps from "vscode-languageserver/node";

export interface IMenuEntry
{
    Option: string;
    Range: lsps.Range;
}
