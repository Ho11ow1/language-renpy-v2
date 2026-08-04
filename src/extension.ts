import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { CompletionItemProvider } from "@src/autocomplete";
import { SignatureHelpProvider } from "@src/signature";
import { HoverItemProvider } from "@src/hover";
import { Store } from "@src/store";
import { WorkspaceParser } from "@parser/workspaceparser";
import { DefinitionProvider } from "@src/definition";

const RENPY_FILE_PATTERNS = "{**/*.rpy,**/*_ren.py}" as const;

export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    // Setup static store & parse all wanted files
    Logger.updateStatusBar("Initializing Ren'Py v2", `$(loading~spin)`);
    await init();

    // Register debug subscriptions
    context.subscriptions.push(Logger.outputChannel);
    context.subscriptions.push(Logger.statusBar);

    // Register intellisense providers
    context.subscriptions.push(new CompletionItemProvider().getDisposable());
    context.subscriptions.push(new HoverItemProvider().getDisposable());
    context.subscriptions.push(new SignatureHelpProvider().getDisposable());
    context.subscriptions.push(new DefinitionProvider().getDisposable())

    // File system watcher so we update what we know
    context.subscriptions.push(setupWatcher());

    Logger.logMessage("Successfully initialized and parsed all files");
    Logger.updateStatusBar("Ren'Py v2 Initialized", `$(heart)`);
}

export function deactivate(): void {}

async function init(): Promise<void>
{
    Logger.clear();

    Store.init();

    Logger.logMessage("Finished indexing renpy.json tree");

    const files = await vscode.workspace.findFiles(RENPY_FILE_PATTERNS, "**/node_modules/**"); // We shouldn't need to exclude node_modules but just in case so we don't even try looking
    for (const fileUri of files)
    {
        WorkspaceParser.parseFile(fileUri.fsPath);
    }

    Logger.logMessage("Finished parsing all renpy files");
}

function setupWatcher(): vscode.FileSystemWatcher
{
    const watcher = vscode.workspace.createFileSystemWatcher(RENPY_FILE_PATTERNS);

    watcher.onDidChange((uri): void => {
        WorkspaceParser.parseFile(uri.fsPath);
    });
    watcher.onDidCreate((uri): void => {
        WorkspaceParser.parseFile(uri.fsPath);
    });
    watcher.onDidDelete((uri): void => {
        Store.removeDeclarationsFromFile(uri.fsPath);
    });

    return watcher;
}
