import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Store } from "@server/store";
import * as Utils from "@server/utils/index";

export class CompletionItemProvider
{
    //
    //  INTERACTIVITY
    //
    private readonly _callRegex: RegExp = /(?:^|\s)(?:call)\s+([a-zA-Z0-9_]*)$/;
    private readonly _jumpRegex: RegExp = /(?:^|\s)(?:jump)\s+([a-zA-Z0-9_]*)$/;
    private readonly _callShowScreenRegex: RegExp = /(?:^|\s)(?:call|show|hide)\s+screen\s+([a-zA-Z0-9_]*)$/;
    //
    //  DISPLAYABLE
    //
    private readonly _showHideScreenRegex: RegExp = /(?:^|\s)(?:show|hide)\s+screen\s+([a-zA-Z0-9_]*)$/;
    private readonly _showHideRegex: RegExp = /(?:^|\s)(?:show|hide)\s+([a-zA-Z0-9_]*)$/;
    private readonly _sceneRegex: RegExp = /(?:^|\s)(?:scene)\s+([a-zA-Z0-9_]*)$/;

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

        const lineText = document.getText({
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line, character: params.position.character }
        });

        //
        //  LABELS & SCREENS
        //
        if (this._jumpRegex.test(lineText))
        {
            return Store.getLabels().map((node): lsps.CompletionItem => node.toCompletionItem());
        }
        if (this._callRegex.test(lineText))
        {
            let items = Store.getLabels().map((node): lsps.CompletionItem => node.toCompletionItem());
            items.push({
                label: "screen",
                kind: lsps.CompletionItemKind.Keyword,
            });

            return items;
        }
        if (this._callShowScreenRegex.test(lineText))
        {
            return Store.getScreens().map((node): lsps.CompletionItem => node.toCompletionItem());
        }
        //
        //  DISPLAYABLES
        //
        if (this._showHideScreenRegex.test(lineText))
        {
            return Store.getScreens().map((node): lsps.CompletionItem => node.toCompletionItem());
        }
        if (this._sceneRegex.test(lineText))
        {
            return Store.getImages().map((node): lsps.CompletionItem => node.toCompletionItem());
        }
        if (this._showHideRegex.test(lineText))
        {
            let items = Store.getImages().map((node): lsps.CompletionItem => node.toCompletionItem());
            items.push({
                label: "screen",
                kind: lsps.CompletionItemKind.Keyword,
            });

            return items;
        }

        return [];
    }
}
