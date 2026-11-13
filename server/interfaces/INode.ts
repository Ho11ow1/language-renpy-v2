import * as lsps from "vscode-languageserver/node";

export interface INode
{
    Name: string;                           // Identifier
    Detail: string;                         // Show on auto-complte / hover information | Now grabbed via document.getText(range) rather than construction
    Documentation: string;                  // Hover MD documentation                   | Now grabbed via document.getText(range) rather than construction
    Location?: lsps.Location;               // Self explanitory | Namespace nodes aren't necessarily declared so optional, refs however are not optional
    References: lsps.Location[];            // Self explanitory
    Range: lsps.Range;                      // Full scope range
    SelectionRange: lsps.Range;             // Select name

    addReference(ref: lsps.Location | lsps.Location[]): void;
    updateRange(range: lsps.Range): void;
}
