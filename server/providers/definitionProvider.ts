import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Store } from "@server/store";

export class DefinitionProvider
{
    private readonly _fullWordRegex: RegExp = /[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*/g;

    public provideDefinition(params: lsps.DeclarationParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.Definition | undefined
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return undefined;
        }

        const fullRange = document.getText({
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line + 1, character: 0 }
        });

        const targetWord = this.getWordAtPosition(fullRange, params.position);
        if (!targetWord)
        {
            return undefined;
        }

        //
        //  Temporary until we start doinga regex match of a few previous words to determine what context it is being used in
        //
        return Store.getLabel(targetWord)?.Location ?? Store.getScreen(targetWord)?.Location ?? Store.getImage(targetWord)?.Location ?? Store.getTransform(targetWord)?.Location;
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
