import * as lsps from "vscode-languageserver/node";

export interface INode
{
    Name: string;                           // Identifier
    Detail: string;                         // Show on auto-complte / hover information
    Documentation: string;                  // Hover MD documentation
    Location?: lsps.Location;               // Self explanitory | Namespace nodes aren't necessarily declared so optional, refs however are not optional
    References: lsps.Location[];            // Self explanitory
    Range: lsps.Range;                      // Full scope range
    SelectionRange: lsps.Range;             // Select 0 -> :

    addReference(ref: lsps.Location | lsps.Location[]): void;
}
