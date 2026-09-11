import * as Models from "@server/models/index";
import * as Interfaces from "@server/interfaces/index";
import * as lsps from "vscode-languageserver/node";

export class MenuNode extends Models.Node
{
    public IsNamed: boolean;
    public Options: Interfaces.IMenuEntry[] = [];

    constructor(name: string, detail: string, range: lsps.Range, selectionRange: lsps.Range, kind: lsps.CompletionItemKind, symbolKind: lsps.SymbolKind, isNamed: boolean, location?: Interfaces.ILocationRef, documentation: string = "")
    {
        super(name, detail, range, selectionRange, kind, symbolKind, location, documentation);

        this.IsNamed = isNamed;
    }

    public addOption(option: Interfaces.IMenuEntry | Interfaces.IMenuEntry[]): void
    {
        if (Array.isArray(option))
        {
            this.Options.push(...option);
        }
        else
        {
            this.Options.push(option);
        }
    }

    public override toDocumentSymbol(): lsps.DocumentSymbol
    {
        const symbol = super.toDocumentSymbol();

        if (this.Options.length > 0)
        {
            symbol.children = this.Options.map((opt): lsps.DocumentSymbol => ({
                name: opt.Option,
                detail: "",
                kind: lsps.SymbolKind.EnumMember,
                range: opt.Range,
                selectionRange: opt.Range,
            }));
        }

        return symbol;
    }
}
