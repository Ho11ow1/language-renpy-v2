import * as vscode from "vscode";
import * as Common from "@common/index";

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
