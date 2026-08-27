import * as vscode from "vscode";
import * as Common from "@common/variables";

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

        const missing = Common.EXCLUDE_FROM_VIEW_TARGETS.filter((key): boolean => !Object.hasOwn(excluded, key));
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
}
