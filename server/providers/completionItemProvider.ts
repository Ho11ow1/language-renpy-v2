import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

export class CompletionItemProvider
{
    public provideCompletionItems(params: lsps.TextDocumentPositionParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.CompletionItem[]
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

        if (document.getText({ start: { line: params.position.line, character: 0 }, end: { line: params.position.line, character: params.position.character } }).endsWith("."))
        {
            return [];
        }

        return [
            {
                label: this.something(),
                kind: lsps.CompletionItemKind.Keyword,
                detail: "Something"
            }
        ];
    }

    private something(): string
    {
        return "something";
    }
}
