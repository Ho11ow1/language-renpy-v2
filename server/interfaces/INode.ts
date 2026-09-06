import * as lsps from "vscode-languageserver/node";
import * as Interfaces from "@server/interfaces/index";

export interface INode
{
    Name: string;                           // Identifier
    Location?: Interfaces.ILocationRef;     // Self explanitory | Namespace nodes aren't necessarily declared so optional, refs however are not optional
    References: Interfaces.ILocationRef[];  // Self explanitory
    Range: lsps.Range;                      // Full scope range
    SelectionRange: lsps.Range;             // Select 0 -> :

    addReference(ref: Interfaces.ILocationRef | Interfaces.ILocationRef[]): void;
}
