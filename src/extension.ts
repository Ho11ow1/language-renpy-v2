import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { CompletionItemProvider } from "@src/autocomplete";
import { HoverItemProvider } from "@src/hover";
import { Store } from "@src/store";
import { WorkspaceParser } from "@parser/WorkspaceParser";

//
//  TODO: Restructure this into multiple functions rather than 1 messy block
//
export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    Logger.Clear();
    Logger.UpdateStatusBar("Initializing Extension");

    // Init static store from renpy.json
    Logger.LogMessage("Creating tree from static renpy.json");
    Store.Initialize();
    Logger.LogMessage("Finished indexing renpy.json tree");

    Logger.LogMessage("Starting file parsing");
    const files = await vscode.workspace.findFiles("{**/*.rpy,**/*_ren.py}", "**/node_modules/**");
    for (const fileUri of files)
    {
        WorkspaceParser.ParseFile(fileUri.fsPath);
    }
    Logger.LogMessage("Finished parsing all files");

    // Register debug subscriptions
    context.subscriptions.push(Logger.outputChannel);
    context.subscriptions.push(Logger.statusBar);

    // Register intellisense providers
    context.subscriptions.push(new CompletionItemProvider().GetDisposable());
    context.subscriptions.push(new HoverItemProvider().GetDisposable());

    // Setup system watcher for changes
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("{**/*.rpy,**/*_ren.py}");
    watcher.onDidChange((uri): void => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidCreate((uri): void => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidDelete((uri): void => {
        Store.RemoveDeclarationsFromFile(uri.fsPath);
    });

    context.subscriptions.push(watcher);

    Logger.UpdateStatusBar("Ren'Py v2 Initialized");
    Logger.LogMessage("Successfully initialized and parsed all files");
}

export function deactivate(): void {}
