import * as vscode from "vscode";
import { Logger } from "@utils/logger";
import { CompletionItemProvider } from "./autocomplete";
import { HoverItemProvider } from "./hover";
import { Store } from "./store";
import { WorkspaceParser } from "@parser/workspaceparser";

export function activate(context: vscode.ExtensionContext)
{
    Logger.Clear();
    Logger.UpdateStatusBar("Initializing Extension");
    Store.Initialize();
    // Debug stuff
    context.subscriptions.push(Logger.outputChannel);
    context.subscriptions.push(Logger.statusBar);

    // Intellisense
	context.subscriptions.push(new CompletionItemProvider().GetDisposable());
    context.subscriptions.push(new HoverItemProvider().GetDisposable());

    Logger.UpdateStatusBar("Ren'Py v2 Initialized");

    const watcher = vscode.workspace.createFileSystemWatcher("**/*.rpy");
    watcher.onDidChange((uri) => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidCreate((uri) => {
        WorkspaceParser.ParseFile(uri.fsPath);
    });
    watcher.onDidDelete((uri) => {
        Store.RemoveDeclarationsFromFile(uri.fsPath);
    });

    context.subscriptions.push(watcher);
}

export function deactivate() {}
