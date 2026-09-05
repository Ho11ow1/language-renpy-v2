import * as lsps from "vscode-languageserver/node";
import * as Interfaces from "@server/interfaces/index";

export class LabelNode implements Interfaces.INode
{
    public Name: string;
    public Location: Interfaces.ILocationRef;
    public Range: lsps.Range;
    public SelectionRange: lsps.Range;

    public constructor(name: string, range: lsps.Range, selectionRange: lsps.Range, location: Interfaces.ILocationRef)
    {
        this.Name = name;
        this.Range = range;
        this.SelectionRange = selectionRange;
        this.Location = location;
    }
}
