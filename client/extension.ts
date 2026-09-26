import * as path from "path";
import * as vscode from "vscode";
import * as lspc from "vscode-languageclient/node";
import * as Utils from "@client/utils/index";
import * as Middleware from "@client/middleware/index";
import * as Config from "@client/config/workspaceConfig";
import * as Commands from "@client/commands";
import * as Debugger from "@client/debugger";
import * as Common from "@common/index";

let languageClient: lspc.LanguageClient | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    Utils.Logger.clear();
    Utils.Logger.updateStatusBar("Initializing Ren'Py v2", `$(loading~spin)`);

    registerClientCapabilities(context);

    await startLanguageServer(context);

    const cwd = vscode.workspace.workspaceFolders;
    if (cwd)
    {
        Utils.EditorUtils.createSettingsJson(cwd[0]);
        registerWorkspaceListeners(context, cwd[0]);
    }

    Utils.Logger.updateStatusBar("Ren'Py v2 Initialized", `$(heart)`);
}

export function deactivate(): Promise<void> | undefined
{
    return languageClient?.stop();
}

function registerClientCapabilities(context: vscode.ExtensionContext): void
{
    context.subscriptions.push(Utils.Logger._outputChannel);
    context.subscriptions.push(Utils.Logger._statusBar);

    context.subscriptions.push(new Debugger.DebugAdapterFactory().getDisposable());
    context.subscriptions.push(Debugger.DebugAdapterFactory.getDebugCommandDisposable());

    context.subscriptions.push(...Commands.ContextMenu.getDisposables());
    context.subscriptions.push(...Commands.Utility.getDisposables());
}

function registerWorkspaceListeners(context: vscode.ExtensionContext, folder: vscode.WorkspaceFolder): void
{
    const pattern = new vscode.RelativePattern(folder, ".editorconfig");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    let debounceTimer: NodeJS.Timeout | undefined = undefined;

    watcher.onDidChange((): void => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout((): void => {
            languageClient?.sendNotification(Common.LSP_EDITORCONFIG_UPDATE_PATH, { message: "", type: Common.NotificationType.UPDATE });
        }, Common.LSP_NORMALIZED_DEBOUNCE_MS);
    });

    watcher.onDidDelete((): void => {
        clearTimeout(debounceTimer);
        languageClient?.sendNotification(Common.LSP_EDITORCONFIG_UPDATE_PATH, { message: "", type: Common.NotificationType.DELETE });
    });

    context.subscriptions.push(watcher);
}

function registerClientNotificationListeners(client: lspc.LanguageClient): void
{
    client.onNotification(Common.LSP_SAVE_UPDATE_PATH, (params: Common.INotification): void => Config.WorkspaceConfig.setFsSaveDirectory(params.message));
}

function getMiddleware(): lspc.Middleware
{
    return {
        provideDocumentColors(document, token, next): vscode.ProviderResult<vscode.ColorInformation[]>
        {
            return Middleware.withGlobalMiddleware("provideDocumentColors", (): vscode.ProviderResult<vscode.ColorInformation[]> => {
                return next(document, token);
            });
        },
        provideColorPresentations(color, context, token, next): vscode.ProviderResult<vscode.ColorPresentation[]>
        {
            return Middleware.withGlobalMiddleware("provideColorPresentations", (): vscode.ProviderResult<vscode.ColorPresentation[]> => {
                return next(color, context, token);
            });
        },
        provideCompletionItem(document, position, context, token, next): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> | undefined
        {
            return Middleware.withGlobalMiddleware("provideCompletionItem", (): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> | undefined => {
                return next(document, position, context, token);
            });
        },
        provideDocumentSymbols(document, token, next): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> | undefined
        {
            return Middleware.withGlobalMiddleware("provideDocumentSymbols", (): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> | undefined => {
                return next(document, token);
            });
        },
        provideReferences(document, position, options, token, next): vscode.ProviderResult<vscode.Location[]> | undefined
        {
            return Middleware.withGlobalMiddleware("provideReferences", (): vscode.ProviderResult<vscode.Location[]> | undefined => {
                return next(document, position, options, token);
            });
        },
        provideDefinition(document, position, token, next): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> | undefined
        {
            return Middleware.withGlobalMiddleware("provideDefinition", (): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> | undefined => {
                return next(document, position, token);
            });
        },
        provideRenameEdits(document, position, newName, token, next): vscode.ProviderResult<vscode.WorkspaceEdit> | undefined
        {
            return Middleware.withGlobalMiddleware("provideRenameEdits", (): vscode.ProviderResult<vscode.WorkspaceEdit> | undefined => {
                return next(document, position, newName, token);
            });
        },
        prepareRename(document, position, token, next): vscode.ProviderResult<vscode.Range | { range: vscode.Range, placeholder: string}> | undefined
        {
            return Middleware.withGlobalMiddleware("prepareRename", (): vscode.ProviderResult<vscode.Range | { range: vscode.Range, placeholder: string}> | undefined => {
                return next(document, position, token);
            });
        },
        handleDiagnostics(uri, diagnostics, next): void
        {
            return Middleware.withGlobalMiddleware("handleDiagnostics", (): void => {
                if (!Config.WorkspaceConfig.diagnosticsEnabled)
                {
                    return;
                }

                next(uri, diagnostics);
            });
        }
    };
}

function getServerOptions(context: vscode.ExtensionContext): lspc.ServerOptions
{
    const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

    return {
        run: {
            module: serverModule,
            transport: lspc.TransportKind.ipc,
            options: {
                execArgv: ["--inspect=1563"]
            }
        },
        debug: {
            module: serverModule,
            transport: lspc.TransportKind.ipc,
            options: {
                execArgv: ["--nolazy", "--inspect=1563"]
            }
        }
    };
}

function getClientOptions(): lspc.LanguageClientOptions
{
    return {
        documentSelector: [
            { scheme: "file", language: "renpy", pattern: Common.RENPY_FORMAT_GLOB }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher(Common.RENPY_FORMAT_GLOB)
        },
        markdown: {
            isTrusted: true
        },
        middleware: getMiddleware()
    };
}

async function startLanguageServer(context: vscode.ExtensionContext): Promise<void>
{
    languageClient = new lspc.LanguageClient(
        "renpyLanguageServer",
        "Ren'Py Language Server",
        getServerOptions(context),
        getClientOptions()
    );

    registerClientNotificationListeners(languageClient);

    await languageClient.start();
}
