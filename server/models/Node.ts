import * as Interfaces from "@server/interfaces/index";
import * as lsps from "vscode-languageserver/node";

export class Node implements Interfaces.INode
{
    public Name: string;
    public Location?: Interfaces.ILocationRef;
    public References: Interfaces.ILocationRef[];
    public Range: lsps.Range;
    public SelectionRange: lsps.Range;

    public constructor(name: string, range: lsps.Range, selectionRange: lsps.Range, location?: Interfaces.ILocationRef)
    {
        this.Name = name;
        this.Range = range;
        this.SelectionRange = selectionRange;
        this.Location = location;
        this.References = [];
    }

    public addReference(ref: Interfaces.ILocationRef | Interfaces.ILocationRef[]): void
    {
        if (Array.isArray(ref))
        {
            this.References.push(...ref);
        }
        else
        {
            this.References.push(ref);
        }
    }
}
