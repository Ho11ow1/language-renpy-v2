import * as path from "path";
import * as vscode from "vscode";
import * as lspc from "vscode-languageclient/node";
import * as Utils from "@client/utils/index";
import * as Middleware from "@client/middleware/index";
import * as Common from "@common/index";
import * as Commands from "./commands";
import * as Config from "@client/config/workspaceConfig";
import { DebugAdapterFactory } from "./debugger";

let languageClient: lspc.LanguageClient | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    pushDisposables(context);
    Utils.Logger.clear();
    Utils.Logger.updateStatusBar("Initializing Ren'Py v2", `$(loading~spin)`);

    const cwd = vscode.workspace.workspaceFolders;
    if (cwd)
    {
        Utils.EditorUtils.createSettingsJson(cwd[0]);
    }

    await startLanguageServer(context);
    Utils.Logger.updateStatusBar("Ren'Py v2 Initialized", `$(heart)`);
}

export function deactivate(): Promise<void> | undefined
{
    if (!languageClient)
    {
        return undefined;
    }

    return languageClient.stop();
}

function pushDisposables(context: vscode.ExtensionContext): void
{
    context.subscriptions.push(Utils.Logger._outputChannel);
    context.subscriptions.push(Utils.Logger._statusBar);

    context.subscriptions.push(new DebugAdapterFactory().getDisposable());
    context.subscriptions.push(DebugAdapterFactory.getDebugCommandDisposable());

    context.subscriptions.push(...Commands.ContextMenu.getDisposables());
    context.subscriptions.push(...Commands.Utility.getDisposables());
}

async function startLanguageServer(context: vscode.ExtensionContext): Promise<void>
{
    const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

    const serverOptions: lspc.ServerOptions = {
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

    const clientOptions: lspc.LanguageClientOptions = {
        documentSelector: [
            {
                scheme: "file",  language: "renpy", pattern: Common.RENPY_FORMAT_GLOB
            }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher(Common.RENPY_FORMAT_GLOB),
        },
        markdown: {
            isTrusted: true
        },
        middleware: {
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
                    if (Middleware.isLargeFile(document))
                    {
                        return undefined;
                    }

                    return next(document, position, context, token);
                });
            },
            provideDocumentSymbols(document, token, next): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> | undefined {
                return Middleware.withGlobalMiddleware("provideDocumentSymbols", (): vscode.ProviderResult<vscode.DocumentSymbol[] | vscode.SymbolInformation[]> | undefined => {
                    if (Middleware.isLargeFile(document))
                    {
                        return undefined;
                    }

                    return next(document, token);
                });
            },
        }
    };


    languageClient = new lspc.LanguageClient(
        "renpyLanguageServer",
        "Ren'Py Language Server",
        serverOptions,
        clientOptions
    );

    languageClient.onNotification("renpyv2/config/dir", (params: Common.INotification) => Config.WorkspaceConfig.setFsSaveDirectory(params.message));

    await languageClient.start();
}
