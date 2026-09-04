import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as Providers from "@server/providers/index";
import * as Utils from "@server/utils/index";
import * as Common from "@common/index";
import { Lexer } from "./lexer";
import { Parser } from "./parser";

const connection: lsps.Connection = lsps.createConnection(lsps.ProposedFeatures.all);
const documents: lsps.TextDocuments<TextDocument> = new lsps.TextDocuments(TextDocument);
Utils.Logger.init(connection.console);

const colorProvider = new Providers.ColorProvider();
const completionItemProvider = new Providers.CompletionItemProvider();
const documentSymbolProvider = new Providers.DocumentSymbolProvider();

function HandleSubscriptions(): void
{
    connection.onInitialize((params: lsps.InitializeParams): lsps.InitializeResult => {
        Utils.DocumentUtils.init(params.workspaceFolders?.[0].uri);

        return {
            capabilities: {
                textDocumentSync: lsps.TextDocumentSyncKind.Incremental,
                workspace: {
                    fileOperations: {
                        didCreate: {
                            filters: [
                                {
                                    scheme: "file",
                                    pattern: {
                                        glob: Common.RENPY_FORMAT_GLOB
                                    }
                                }
                            ]
                        },
                        didDelete: {
                            filters: [
                                {
                                    scheme: "file",
                                    pattern: {
                                        glob: Common.RENPY_FORMAT_GLOB
                                    }
                                }
                            ]
                        },
                        didRename: {
                            filters: [
                                {
                                    scheme: "file",
                                    pattern: {
                                        glob: Common.RENPY_FORMAT_GLOB
                                    }
                                }
                            ]
                        },
                    }
                },
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

    connection.workspace.onDidDeleteFiles((params): void => {
        const docs = params.files;

        for (const doc of docs)
        {
            Utils.Logger.logMessage(doc.uri);
            if (!Utils.DocumentUtils.isInCwd(doc.uri))
            {
                continue;
            }

            connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
        }
    });
    connection.workspace.onDidCreateFiles((params): void => {
        const docs = params.files;

        for (const doc of docs)
        {
            Utils.Logger.logMessage(doc.uri);
            if (!Utils.DocumentUtils.isInCwd(doc.uri))
            {
                continue;
            }
            if (!Utils.DocumentUtils.isValidFilename(doc.uri))
            {
                connection.sendDiagnostics({ uri: doc.uri, diagnostics: [{
                    severity: lsps.DiagnosticSeverity.Information,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                    message: "Filenames should start with a number or letter but not 00",
                    source: "Ren'Py v2"
                }] });
            }
        }
    });
    connection.workspace.onDidRenameFiles((params): void => {
        const docs = params.files;

        for (const doc of docs)
        {
            Utils.Logger.logMessage(`${doc.oldUri} | ${doc.newUri}`);
            if (!Utils.DocumentUtils.isInCwd(doc.newUri))
            {
                continue;
            }
            if (!Utils.DocumentUtils.isValidFilename(doc.newUri))
            {
                connection.sendDiagnostics({ uri: doc.newUri, diagnostics: [{
                    severity: lsps.DiagnosticSeverity.Information,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                    message: "Filenames should start with a number or letter but not 00",
                    source: "Ren'Py v2"
                }] });
            }

            connection.sendDiagnostics({ uri: doc.oldUri, diagnostics: [] });
        }
    });

    connection.onInitialized(async (params) => {
        const docs = await Utils.DocumentUtils.getWorkspaceRenpyFilePaths(true);

        for (const doc of docs)
        {
            Utils.Logger.logMessage(doc);
            if (!Utils.DocumentUtils.isValidFilename(doc))
            {
                connection.sendDiagnostics({ uri: doc, diagnostics: [{
                    severity: lsps.DiagnosticSeverity.Information,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                    message: "Filenames should start with a number or letter but not 00",
                    source: "Ren'Py v2"
                }] });
            }
        }
    });

    documents.onDidChangeContent((change): void => {
        const textDocument = change.document;
        if (!Utils.DocumentUtils.isInCwd(textDocument.uri))
        {
            return;
        }
        if (textDocument.getText({ start: { line: 0, character: 0 }, end: { line: 0, character: Common.NO_QUALITY_ASSURANCE.length } }) === Common.NO_QUALITY_ASSURANCE)
        {
            connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
            return;
        }

        const diagnostics: lsps.Diagnostic[] = [];
        if (!Utils.DocumentUtils.isValidFilename(textDocument.uri))
        {
            diagnostics.push({
                severity: lsps.DiagnosticSeverity.Information,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                message: "Filenames should start with a number or letter but not 00",
                source: "Ren'Py v2"
            });
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
                source: "Ren'Py v2"
            });
        }

        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}

function HandleListeners(): void
{
    documents.listen(connection);
    connection.listen();
}

HandleSubscriptions();
HandleListeners();
