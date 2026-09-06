import * as lsps from "vscode-languageserver/node";

export interface ILocationRef
{
    Uri: string;
    Range: lsps.Range;
}
