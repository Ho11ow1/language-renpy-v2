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
const fileOperationFilters: lsps.FileOperationRegistrationOptions = {
    filters: [
        { scheme: "file", pattern: { glob: Common.RENPY_FORMAT_GLOB } }
    ]
};

const colorProvider = new Providers.ColorProvider();
const completionItemProvider = new Providers.CompletionItemProvider();
const documentSymbolProvider = new Providers.DocumentSymbolProvider();
const referenceProvider = new Providers.ReferenceProvider();
const definitionProvider = new Providers.DefinitionProvider();
const renameProvider = new Providers.RenameProvider();

function getServerCapabilities(): lsps.ServerCapabilities
{
    return {
        textDocumentSync: lsps.TextDocumentSyncKind.Incremental,
        workspace: {
            fileOperations: {
                didCreate: fileOperationFilters,
                didDelete: fileOperationFilters,
                didRename: fileOperationFilters
            }
        },
        completionProvider: {
            resolveProvider: false,
            // So this is actualy additional triggerCharacters while the normal behvaiour is just any char.
            triggerCharacters: ['.']
        },
        colorProvider: true,
        documentSymbolProvider: true,
        referencesProvider: true,
        definitionProvider: true,
        renameProvider: {
            prepareProvider: true
        }
    };
}

function registerFeatureListeners(): void
{
    connection.onCompletion((params, token): lsps.CompletionItem[] => completionItemProvider.provideCompletionItems(params, token, documents));
    connection.onDocumentColor((params, token): lsps.ColorInformation[] => colorProvider.provideDocumentColors(params, token, documents));
    connection.onColorPresentation((params, token): lsps.ColorPresentation[] => colorProvider.provideColorPresentations(params, token, documents));
    connection.onDocumentSymbol((params, token): lsps.DocumentSymbol[] => documentSymbolProvider.providerDocumentOutline(params, token));
    connection.onReferences((params, token):lsps.Location[] => referenceProvider.provideReferences(params, token, documents));
    connection.onDefinition((params, token): lsps.Definition | undefined => definitionProvider.provideDefinition(params, token, documents));
    connection.onRenameRequest((params, token): lsps.WorkspaceEdit | undefined => renameProvider.provideRename(params, token, documents));
    connection.onPrepareRename((params, token): lsps.PrepareRenameResult | null => renameProvider.onPrepareRename(params, token, documents));
}

function registerWorkspaceListeners(): void
{
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

    connection.workspace.onDidRenameFiles((params): void => {
        for (const doc of params.files)
        {
            const normalizedOldUri = Utils.DocumentUtils.normalizeUri(doc.oldUri);
            const normalizedNewUri = Utils.DocumentUtils.normalizeUri(doc.newUri);

            Diagnostics.clear(normalizedOldUri);

            if (Utils.DocumentUtils.isInCwd(normalizedNewUri))
            {
                Store.renameDocument(normalizedOldUri, normalizedNewUri);
            }
            else
            {
                Store.clearDocumentNodes(normalizedOldUri);
            }
        }
    });
}

function registerDocumentListeners(): void
{
    let debounceTimer: NodeJS.Timeout | undefined = undefined;

    documents.onDidClose((e): void => {
        clearTimeout(debounceTimer);

        Diagnostics.clear(Utils.DocumentUtils.normalizeUri(e.document.uri));
    });

    documents.onDidChangeContent((change): void => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout((): void => {
            const textDocument = change.document;
            const normalizedUri = Utils.DocumentUtils.normalizeUri(textDocument.uri);

            if (!Utils.DocumentUtils.isInCwd(normalizedUri))
            {
                return;
            }

            Diagnostics.clear(normalizedUri);

            const tokens = Lexer.tokenizeDocument(textDocument.getText());
            Parser.parseDocumentDeclarations(tokens, textDocument);
            Parser.parseDocumentReferences(tokens, textDocument);

            Diagnostics.pushDiagnostics(normalizedUri);
        }, Common.LSP_NORMALIZED_DEBOUNCE_MS);
    });
}

function registerNotificationListeners(): void
{
    connection.onNotification(Common.LSP_EDITORCONFIG_UPDATE_PATH, async (params: Common.INotification): Promise<void> => {
        if (params.type === Common.NotificationType.UPDATE)
        {
            await Utils.DocumentUtils.parseEditorConfig();
        }
        else
        {
            Diagnostics.clearOverrides();
        }
    });
}

async function initializeWorkspace(): Promise<void>
{
    await Utils.DocumentUtils.parseEditorConfig();

    const docPaths = await Utils.DocumentUtils.getWorkspaceRenpyFilePaths();
    const tokensByDocument = new Map<TextDocument, Models.Token[]>();

    for (const docPath of docPaths)
    {
        const docUri = Utils.DocumentUtils.normalizeUri(pathToFileURL(docPath).href);
        const document = TextDocument.create(docUri, "renpy", 0, await fs.promises.readFile(docPath, { encoding: "utf-8" }));

        const match = document.getText().match(/^\s*define\s+config\.save_directory\s*=\s*(["'])(.*?)\1/m);
        if (match)
        {
            connection.sendNotification(Common.LSP_SAVE_UPDATE_PATH, { message: match[2], type: Common.NotificationType.UPDATE });
        }

        const tokens = Lexer.tokenizeDocument(document.getText());

        tokensByDocument.set(document, tokens);
        Parser.parseDocumentDeclarations(tokens, document);
    }

    for (const [document, tokens] of tokensByDocument)
    {
        Parser.parseDocumentReferences(tokens, document);
    }
}

function registerLifecycle(): void
{
    connection.onInitialize((params: lsps.InitializeParams): lsps.InitializeResult => {
        Utils.DocumentUtils.init(params.workspaceFolders?.[0].uri);
        Utils.Logger.init(connection.console);
        Diagnostics.init(connection);

        return { capabilities: getServerCapabilities() };
    });

    connection.onInitialized(async (): Promise<void> => await initializeWorkspace());
}

function main(): void
{
    registerLifecycle();
    registerFeatureListeners();
    registerWorkspaceListeners();
    registerNotificationListeners();
    registerDocumentListeners();

    documents.listen(connection);
    connection.listen();
}

main();
