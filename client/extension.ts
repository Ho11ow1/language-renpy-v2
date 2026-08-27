import * as path from "path";
import * as vscode from "vscode";
import * as lspc from "vscode-languageclient/node";
import * as Utils from "@client/utils/index";
import * as Middleware from "@client/middleware/index";
import * as Common from "@common/variables";
import { DebugAdapterFactory } from "./debugger";
import { ContextMenuCommands } from "./commands";

let languageClient: lspc.LanguageClient | undefined = undefined;

export function activate(context: vscode.ExtensionContext): void
{
    pushDisposables(context);
    Utils.Logger.clear();
    Utils.Logger.updateStatusBar("Initializing Ren'Py v2", `$(loading~spin)`);

    const cwd = vscode.workspace.workspaceFolders;
    if (cwd)
    {
        Utils.EditorUtils.createSettingsJson(cwd[0]);
    }

    startLanguageServer(context);
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

    context.subscriptions.push(...ContextMenuCommands.getDisposables());
}

function startLanguageServer(context: vscode.ExtensionContext): void
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
                scheme: "file",  language: "renpy"
            }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher(Common.RENPY_FORMAT_GLOB)
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
            }
        }
    };

    languageClient = new lspc.LanguageClient(
        "renpyLanguageServer",
        "Ren'Py Language Server",
        serverOptions,
        clientOptions
    );

    languageClient.start();
}
