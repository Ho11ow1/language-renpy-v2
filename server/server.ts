import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as Providers from "@server/providers/index";
import * as Utils from "@server/utils/index";
import * as Common from "@common/index";
import * as fs from "fs";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { pathToFileURL } from "url";
import { Store } from "./store";
import * as Models from "@server/models/index";
import { Diagnostics } from "./diagnostics";

const connection: lsps.Connection = lsps.createConnection(lsps.ProposedFeatures.all);
const documents: lsps.TextDocuments<TextDocument> = new lsps.TextDocuments(TextDocument);

const colorProvider = new Providers.ColorProvider();
const completionItemProvider = new Providers.CompletionItemProvider();
const documentSymbolProvider = new Providers.DocumentSymbolProvider();
const referenceProvider = new Providers.ReferenceProvider();
const definitionProvider = new Providers.DefinitionProvider();
const renameProvider = new Providers.RenameProvider();

function HandleSubscriptions(): void
{
    connection.onInitialize((params: lsps.InitializeParams): lsps.InitializeResult => {
        Utils.DocumentUtils.init(params.workspaceFolders?.[0].uri);
        Utils.Logger.init(connection.console);
        Diagnostics.init(connection);

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
                        }
                    }
                },
                completionProvider: {
                    resolveProvider: false,
                    triggerCharacters: ['.'] // So this is actualy additional triggerCharacters while the normal behvaiour is just any char starting with.
                },
                colorProvider: true,
                documentSymbolProvider: true,
                referencesProvider: true,
                definitionProvider: true,
                renameProvider: {
                    prepareProvider: true
                }
            },
        };
    });

    connection.onCompletion((params, token): lsps.CompletionItem[] => completionItemProvider.provideCompletionItems(params, token, documents));
    connection.onDocumentColor((params, token): lsps.ColorInformation[] => colorProvider.provideDocumentColors(params, token, documents));
    connection.onColorPresentation((params, token): lsps.ColorPresentation[] => colorProvider.provideColorPresentations(params, token, documents));
    connection.onDocumentSymbol((params, token): lsps.DocumentSymbol[] => documentSymbolProvider.providerDocumentOutline(params, token));
    connection.onReferences((params, token):lsps.Location[] => referenceProvider.provideReferences(params, token, documents));
    connection.onDefinition((params, token): lsps.Definition | undefined => definitionProvider.provideDefinition(params, token, documents));
    connection.onRenameRequest((params, token): lsps.WorkspaceEdit | undefined => renameProvider.provideRename(params, token, documents));
    connection.onPrepareRename((params, token): lsps.PrepareRenameResult | null => renameProvider.onPrepareRename(params, token, documents));

    connection.workspace.onDidDeleteFiles((params): void => {
        for (const doc of params.files)
        {
            const normalizedUri = Utils.DocumentUtils.normalizeUri(doc.uri);
            if (!Utils.DocumentUtils.isInCwd(normalizedUri))
            {
                continue;
            }

            Store.clearDocumentNodes(normalizedUri);
            Diagnostics.clear(normalizedUri);
            connection.sendDiagnostics({ uri: normalizedUri, diagnostics: [] });
        }
    });
    connection.workspace.onDidCreateFiles((params): void => {
        for (const doc of params.files)
        {
            const normalizedUri = Utils.DocumentUtils.normalizeUri(doc.uri);
            if (!Utils.DocumentUtils.isInCwd(normalizedUri))
            {
                continue;
            }
        }
    });
    connection.workspace.onDidRenameFiles((params): void => {
        for (const doc of params.files)
        {
            const normalizedOldUri = Utils.DocumentUtils.normalizeUri(doc.oldUri);
            const normalizedNewUri = Utils.DocumentUtils.normalizeUri(doc.newUri);

            if (Utils.DocumentUtils.isInCwd(normalizedNewUri))
            {
                Diagnostics.clear(normalizedOldUri);
                Store.renameDocument(normalizedOldUri, normalizedNewUri);
            }
            else
            {
                Diagnostics.clear(normalizedOldUri);
                Store.clearDocumentNodes(normalizedOldUri);
            }
        }
    });

    connection.onInitialized(async (): Promise<void> => {
        await Utils.DocumentUtils.parseEditorConfig();
        const docs = await Utils.DocumentUtils.getWorkspaceRenpyFilePaths();
        const map: Map<string, Models.Token[]> = new Map<string, Models.Token[]>();

        for (const docPath of docs)
        {
            const docUri = Utils.DocumentUtils.normalizeUri(pathToFileURL(docPath).href);
            const text = await fs.promises.readFile(docPath, { encoding: "utf-8" });
            const match = text.match(/^\s*define\s+config\.save_directory\s*=\s*(["'])(.*?)\1/m);

            if (match)
            {
                const notification: Common.INotification = { message: match[2] };

                connection.sendNotification("renpyv2/config/dir", notification);
            }

            // const tokens = Lexer.tokenizeDocument(text);
            // map.set(docUri, tokens);
            // Parser.parseDocumentDeclarations(tokens, docUri);
        }

        // for (const [uri, tokens] of map)
        // {
        //     Parser.parseDocumentReferences(tokens, uri);
        // }
    });

    documents.onDidClose((e): void => {
        const normalizedUri = Utils.DocumentUtils.normalizeUri(e.document.uri);

        Diagnostics.clear(normalizedUri);
    });

    documents.onDidOpen((e): void => {
        const text = e.document.getText();
        const tokens = Lexer.tokenizeDocument(text);

        // for (const token of tokens)
        // {
        //     Utils.Logger.logMessage(token.toString());
        // }

        Parser.parseDocumentDeclarations(tokens, e.document);
    });

    // documents.onDidChangeContent((change): void => {
    //     const textDocument = change.document;
    //     const normalizedUri = Utils.DocumentUtils.normalizeUri(textDocument.uri);

    //     if (!Utils.DocumentUtils.isInCwd(normalizedUri))
    //     {
    //         return;
    //     }

    //     Diagnostics.clear(normalizedUri);

    //     const text = textDocument.getText();
    //     const tokens = Lexer.tokenizeDocument(text);

    //     for (const token of tokens)
    //     {
    //         Utils.Logger.logMessage(token.toString());
    //     }

    //     Parser.parseDocumentDeclarations(tokens, textDocument);
    //     // Parser.parseDocumentReferences(tokens, normalizedUri);

    //     // Diagnostics.pushDiagnostics(normalizedUri);
    // });
}

function HandleListeners(): void
{
    documents.listen(connection);
    connection.listen();
}

HandleSubscriptions();
HandleListeners();
