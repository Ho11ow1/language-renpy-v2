import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as Providers from "@server/providers/index";
import * as Utils from "@server/utils/index";
import * as Common from "@common/variables";
import { Lexer } from "./lexer";

const connection: lsps.Connection = lsps.createConnection(lsps.ProposedFeatures.all);
const documents: lsps.TextDocuments<TextDocument> = new lsps.TextDocuments(TextDocument);
Utils.Logger.init(connection.console);

const colorProvider = new Providers.ColorProvider();
const completionItemProvider = new Providers.CompletionItemProvider();
const documentSymbolProvider = new Providers.DocumentSymbolProvider();

function HandleSubscriptions(): void
{
    connection.onInitialize((params: lsps.InitializeParams): lsps.InitializeResult => {
        return {
            capabilities: {
                textDocumentSync: lsps.TextDocumentSyncKind.Incremental,
                completionProvider: {
                    resolveProvider: false,
                    triggerCharacters: ["."] // So this is actualy additional triggerCharacters while the normal behvaiour is just any char starting with.
                },
                colorProvider: true,
                documentSymbolProvider: true
            },
        };
    });

    connection.onCompletion((params, token): lsps.CompletionItem[] => completionItemProvider.provideCompletionItems(params, token, documents));
    connection.onDocumentColor((params, token): lsps.ColorInformation[] => colorProvider.provideDocumentColors(params, token, documents));
    connection.onColorPresentation((params, token): lsps.ColorPresentation[] => colorProvider.provideColorPresentations(params, token, documents));
    connection.onDocumentSymbol((params, token): lsps.DocumentSymbol[] => documentSymbolProvider.providerDocumentOutline(params, token, documents));

    documents.onDidChangeContent((change): void => {
        const textDocument = change.document;
        const diagnostics: lsps.Diagnostic[] = [];

        if (textDocument.getText({ start: { line: 0, character: 0 }, end: { line: 0, character: Common.NO_QUALITY_ASSURANCE.length } }) === Common.NO_QUALITY_ASSURANCE)
        {
            connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
            return;
        }
        const text = textDocument.getText();
        const pattern = /TODO/g;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)))
        {
            const start = textDocument.positionAt(match.index);
            const end = textDocument.positionAt(match.index + match[0].length);

            diagnostics.push({
                severity: lsps.DiagnosticSeverity.Information,
                range: { start, end },
                message: "TODO found",
                source: "Ren'Py v2",
            });
        }

        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });

    //
    //  Will currently tank performance but yeah
    //
    documents.onDidOpen((open): void => {
        const textDocument = open.document;

        const tokens = Lexer.tokenizeDocument(textDocument);

        for (const token of tokens)
        {
            Utils.Logger.logDebug(`${textDocument.uri} | ${token.toString()}`);
        }
    });
}

function HandleListeners(): void
{
    documents.listen(connection);
    connection.listen();
}

HandleSubscriptions();
HandleListeners();
