import * as Interfaces from "@server/interfaces/index";
import * as lsps from "vscode-languageserver/node";

export class Node implements Interfaces.INode
{
    public Name: string;
    public Detail: string;
    public Documentation: string;
    public Location?: lsps.Location;
    public References: lsps.Location[];
    public Range: lsps.Range;
    public SelectionRange: lsps.Range;
    public readonly Kind: lsps.CompletionItemKind;
    public readonly SymbolKind: lsps.SymbolKind;

    public constructor(name: string, detail: string, range: lsps.Range, selectionRange: lsps.Range, kind: lsps.CompletionItemKind, symbolKind: lsps.SymbolKind, location?: lsps.Location, documentation: string = "")
    {
        this.Name = name;
        this.Detail = detail;
        this.Documentation = documentation;
        this.Range = range;
        this.SelectionRange = selectionRange;
        this.Kind = kind;
        this.SymbolKind = symbolKind;
        this.Location = location;
        this.References = [];
    }

    public addReference(ref: lsps.Location | lsps.Location[]): void
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

    public toCompletionItem(): lsps.CompletionItem
    {
        return {
            label: this.Name,
            kind: this.Kind,
            detail: this.Detail,
            documentation: {
                kind: lsps.MarkupKind.Markdown,
                value: this.Documentation
            },
            insertText: this.Name
        };
    }

    public toDocumentSymbol(): lsps.DocumentSymbol
    {
        return {
            name: this.Name,
            detail: "",
            kind: this.SymbolKind,
            range: this.Range,
            selectionRange: this.SelectionRange,
            children: []
        };
    }

    public toHover(): lsps.Hover
    {
        const markdownParts: string[] = [];

        if (this.Location)
        {
            const fileName = this.Location.uri.split('/').pop() || this.Location.uri;
            const lineNumber = this.Location.range.start.line + 1;

            markdownParts.push(`*(custom) | ${fileName} | line ${lineNumber}*`);
        }
        else
        {
            markdownParts.push(`*(custom) | Unknown*`);
        }

        markdownParts.push(`\n${this.Detail}\n`);
        markdownParts.push(this.Documentation);

        return {
            contents: {
                kind: lsps.MarkupKind.Markdown,
                value: markdownParts.join("\n")
            },
            range: this.SelectionRange
        };
    }
}
