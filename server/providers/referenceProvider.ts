import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Store } from "@server/store";

export class ReferenceProvider
{
    private readonly _fullWordRegex: RegExp = /[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*/g;

    public provideReferences(params: lsps.ReferenceParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.Location[]
    {
        if (token.isCancellationRequested)
        {
            return [];
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return [];
        }

        const fullRange = document.getText({
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line + 1, character: 0 }
        });

        const targetWord = this.getWordAtPosition(fullRange, params.position);
        if (!targetWord)
        {
            return [];
        }

        //
        //  Temporary until we start doinga regex match of a few previous words to determine what context it is being used in
        //
        const node = Store.getImage(targetWord) ?? Store.getLabel(targetWord) ?? Store.getScreen(targetWord) ?? undefined;
        if (!node)
        {
            return [];
        }

        return node.References.map((ref): lsps.Location => ({ range: ref.range, uri: ref.uri }));
    }

    private getWordAtPosition(fullTextRange: string, position: lsps.Position): string | undefined
    {
        this._fullWordRegex.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = this._fullWordRegex.exec(fullTextRange)) !== null)
        {
            const start = match.index;
            const end = start + match[0].length;

            if (position.character >= start && position.character < end)
            {
                return match[0];
            }
        }

        return undefined;
    }
}
