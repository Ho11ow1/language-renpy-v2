import * as vscode from "vscode";
import * as Src from "@src/index";
import * as Utils from "@utils/index";
import * as Parsers from "@parser/index";
import * as Config from "@config/index";
import * as Common from "@common/index";
import * as path from "path";

export async function activate(context: vscode.ExtensionContext): Promise<void>
{
    // Setup static store & parse all wanted files
    Utils.Logger.updateStatusBar("Initializing Ren'Py v2", `$(loading~spin)`);

    // Just fire, don't care about it
    setTimeout((): void => {
        Utils.EditorUtils.createSettingsJson(vscode.workspace.workspaceFolders?.[0]);
    }, 0);
    await init();

    // Register debug subscriptions
    context.subscriptions.push(Utils.Logger.outputChannel);
    context.subscriptions.push(Utils.Logger.statusBar);

    // Register intellisense providers
    context.subscriptions.push(new Src.CompletionItemProvider().getDisposable());
    context.subscriptions.push(new Src.HoverItemProvider().getDisposable());
    context.subscriptions.push(new Src.SignatureHelpProvider().getDisposable());
    context.subscriptions.push(new Src.DefinitionProvider().getDisposable());
    context.subscriptions.push(new Src.ColorProvider().getDisposable());
    context.subscriptions.push(new Src.DebugAdapterFactory().getDisposable());
    context.subscriptions.push(new Src.DocumentSymbolProvider().getDisposable());
    context.subscriptions.push(Src.Diagnostics.getCollection());

    // File system watcher so we update what we know
    context.subscriptions.push(getFsWatcher());
    context.subscriptions.push(getDocWatcher());
    context.subscriptions.push(getConfigWatcher());

    context.subscriptions.push(...Src.ContextMenuCommands.getDisposables());
    context.subscriptions.push(Src.DebugAdapterFactory.getDebugCommandDisposable());

    Utils.Logger.logDebug("Successfully initialized and parsed all files");
    Utils.Logger.updateStatusBar("Ren'Py v2 Initialized", `$(heart)`);
}

export function deactivate(): void {}

async function init(): Promise<void>
{
    Utils.Logger.clear();

    Src.Store.init();

    Utils.Logger.logDebug("Finished indexing renpy.json tree");

    if (Config.WorkspaceConfig.sdkPath)
    {
        const reservedDoc = (await Utils.EditorUtils.getSdkDocPaths()).filter((fsPath): boolean => path.basename(fsPath) === Common.renpyStdVarIndexPath);
        if (reservedDoc.length > 0)
        {
            Config.WorkspaceConfig.renpySdkReserved_Names = Parsers.HTMLParser.parseIndexFileForUnderscore(reservedDoc[0]);
        }
    }
    const documents = await Utils.EditorUtils.getRenpyDocuments();
    for (const doc of documents)
    {
        Parsers.WorkspaceParser.parseFile(doc);
    }
    if (Config.WorkspaceConfig.diagnosticsEnabled)
    {
        for (const doc of documents)
        {
            Src.Diagnostics.generateDiagnostics(doc);
        }
    }

    Utils.Logger.logDebug("Finished parsing all renpy files");
}

function getFsWatcher(): vscode.FileSystemWatcher
{
    const watcher = vscode.workspace.createFileSystemWatcher(Common.filenamePatters);

    watcher.onDidCreate((uri): void => {
        if (Config.WorkspaceConfig.diagnosticsEnabled)
        {
            const diag = Src.Diagnostics.diagnoseFilename(uri.fsPath);
            Src.Diagnostics.getCollection().set(uri, diag ? [diag] : []);
        }
    });
    watcher.onDidDelete((uri): void => {
        Src.Store.removeDeclarationsFromFile(uri.fsPath);
        Src.Diagnostics.removeNotifications(uri.fsPath);
    });

    return watcher;
}

function getDocWatcher(): vscode.Disposable
{
    return vscode.workspace.onDidChangeTextDocument((e): void => {
        if (e.document.languageId !== "renpy")
        {
            return;
        }

        Parsers.WorkspaceParser.parseFile(e.document);

        if (Config.WorkspaceConfig.diagnosticsEnabled)
        {
            Src.Diagnostics.generateDiagnostics(e.document);
        }
    });
}

function getConfigWatcher(): vscode.Disposable
{
    return vscode.workspace.onDidChangeConfiguration((e): void => {
        if (e.affectsConfiguration("renpy.diagnosticsEnabled"))
        {
            if (Config.WorkspaceConfig.diagnosticsEnabled)
            {
                Src.Diagnostics.generateDiagnostics();
            }
            else
            {
                Src.Diagnostics.removeNotifications();
            }
        }
    });
}
