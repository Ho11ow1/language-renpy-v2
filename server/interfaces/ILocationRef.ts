import * as lsps from "vscode-languageserver/node";

export interface ILocationRef
{
    Range: lsps.Range;
    Uri: string;
}
