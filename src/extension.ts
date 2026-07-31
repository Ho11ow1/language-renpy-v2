import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { CompletionItemProvider } from "@src/autocomplete";
import { HoverItemProvider } from "@src/hover";
import { Store } from "@src/store";
import { WorkspaceParser } from "@parser/WorkspaceParser";

const RENPY_FILE_PATTERNS = "{**/*.rpy,**/*_ren.py}" as const;

export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    // Setup static store & parse all wanted files
    Logger.UpdateStatusBar("Initializing Ren'Py v2");
    await Initialize();

    // Register debug subscriptions
    context.subscriptions.push(Logger.outputChannel);
    context.subscriptions.push(Logger.statusBar);

    // Register intellisense providers
    context.subscriptions.push(new CompletionItemProvider().GetDisposable());
    context.subscriptions.push(new HoverItemProvider().GetDisposable());

    // File system watcher so we update what we know
    context.subscriptions.push(SetupWatcher());

    Logger.LogMessage("Successfully initialized and parsed all files");
    Logger.UpdateStatusBar("Ren'Py v2 Initialized");
}

export function deactivate(): void {}

async function Initialize(): Promise<void>
{
    Logger.Clear();

    Store.Initialize();

    Logger.LogMessage("Finished indexing renpy.json tree");

    const files = await vscode.workspace.findFiles(RENPY_FILE_PATTERNS, "**/node_modules/**"); // We shouldn't need to exclude node_modules but just in case so we don't even try looking
    for (const fileUri of files)
    {
        WorkspaceParser.ParseFile(fileUri.fsPath);
    }

    Logger.LogMessage("Finished parsing all renpy files");
}

function SetupWatcher(): vscode.FileSystemWatcher
{
    const watcher = vscode.workspace.createFileSystemWatcher(RENPY_FILE_PATTERNS);

    watcher.onDidChange((uri): void => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidCreate((uri): void => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidDelete((uri): void => {
        Store.RemoveDeclarationsFromFile(uri.fsPath);
    });

    return watcher;
}
