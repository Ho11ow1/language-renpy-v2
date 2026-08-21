import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as Common from "@common/index";
import * as Config from "@config/WorkspaceConfig";
import * as Utils from "@utils/index";

export class EditorUtils
{
    public static async createSettingsJson(folder?: vscode.WorkspaceFolder): Promise<void>
    {
        if (!folder)
        {
            return;
        }

        const vscodePath = vscode.Uri.joinPath(folder.uri, ".vscode");
        try
        {
            await vscode.workspace.fs.createDirectory(vscodePath);
        }
        catch {} // Exists

        const settingsPath = vscode.Uri.joinPath(vscodePath, "settings.json");
        let settings: Record<string, any> = {};
        try
        {
            const data = await vscode.workspace.fs.readFile(settingsPath);
            settings = JSON.parse(Buffer.from(data).toString());
        }
        catch {} // Doesn't exist

        const excluded = (settings["files.exclude"] as Record<string, boolean>) ?? {};

        const missing = Common.excludeTargets.filter((key): boolean => !Object.hasOwn(excluded, key));
        if (missing.length == 0)
        {
            return;
        }

        settings["files.exclude"] = {
            ...excluded,
            ...Object.fromEntries(missing.map((key): [string, boolean] => [key, true]))
        };

        await vscode.workspace.fs.writeFile(settingsPath, Buffer.from(JSON.stringify(settings, null, 4) + "\n"));
    }

    public static async getSdkDocPaths(): Promise<string[]>
    {
        let renpyDocs: string[] = [];

        try
        {
            const docDir = await fs.promises.opendir(path.join(Config.WorkspaceConfig.sdkPath, "doc"));

            for await (const entry of docDir) // Learned something new today | for await (var (async iterable))
            {
                if (entry.isFile())
                {
                    renpyDocs.push(path.join(docDir.path, entry.name));
                }
            }
        }
        catch (ex)
        {
            Utils.Logger.logDebug(`ex: ${ex}`);
            return renpyDocs;
        }

        return renpyDocs;
    }

    public static async getRenpyFileUris(): Promise<vscode.Uri[]>
    {
        return await vscode.workspace.findFiles(Common.filenamePatters, "**/node_modules/**");
    }

    public static async getRenpyDocuments(): Promise<vscode.TextDocument[]>
    {
        const uris = await this.getRenpyFileUris();

        return Promise.all(uris.map((uri): Thenable<vscode.TextDocument> => vscode.workspace.openTextDocument(uri)));
    }

    public static getOpenDocuments(): readonly vscode.TextEditor[]
    {
        return vscode.window.visibleTextEditors;
    }

    public static getTabSize(document: vscode.TextDocument): number
    {
        const editor = this.getOpenDocuments().find((e): boolean => e.document.uri.toString() === document.uri.toString());
        if (editor && typeof editor.options.tabSize === "number")
        {
            return editor.options.tabSize;
        }

        return vscode.workspace.getConfiguration("editor", document.uri).get<number>("tabSize") ?? 4;
    }
}
