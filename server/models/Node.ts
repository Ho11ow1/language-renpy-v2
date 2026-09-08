import * as Interfaces from "@server/interfaces/index";
import * as lsps from "vscode-languageserver/node";

export class Node implements Interfaces.INode
{
    public Name: string;
    public Detail: string;
    public Documentation: string;
    public Location?: Interfaces.ILocationRef;
    public References: Interfaces.ILocationRef[];
    public Range: lsps.Range;
    public SelectionRange: lsps.Range;
    public readonly Kind: lsps.CompletionItemKind;
    public readonly SymbolKind: lsps.SymbolKind;

    public constructor(name: string, detail: string, range: lsps.Range, selectionRange: lsps.Range, kind: lsps.CompletionItemKind, symbolKind: lsps.SymbolKind, location?: Interfaces.ILocationRef, documentation: string = "")
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
            //
            //  TODO: Either leave as is, remove, or update to recommended textEdit
            //
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
            const fileName = this.Location.Uri.split('/').pop() || this.Location.Uri;
            const lineNumber = this.Location.Range.start.line + 1;

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
