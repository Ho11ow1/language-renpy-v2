import * as lsps from "vscode-languageserver/node";
import * as Interfaces from "@server/interfaces/index";

export interface INode
{
    Name: string;                       // Identifier
    Location: Interfaces.ILocationRef;  // Self explanitory
    Range: lsps.Range;                  // Full scope range
    SelectionRange: lsps.Range;         // Select 0 -> :
}
