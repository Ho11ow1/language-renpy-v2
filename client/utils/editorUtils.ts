import * as vscode from "vscode";
import * as Common from "@common/index";

export class EditorUtils
{
    public static async createSettingsJson(folder: vscode.WorkspaceFolder): Promise<void>
    {
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

        const excludedFromView = (settings["files.exclude"] as Record<string, boolean>) ?? {};
        const excludedFromSearch = (settings["search.exclude"] as Record<string, boolean>) ?? {};
        const missingFileExclude = Common.EXCLUDE_FROM_VIEW_SEARCH_TARGETS.filter((key): boolean => !Object.hasOwn(excludedFromView, key));
        const missingSearchExclude = Common.EXCLUDE_FROM_VIEW_SEARCH_TARGETS.filter((key): boolean => !Object.hasOwn(excludedFromSearch, key));

        if (missingFileExclude.length == 0 && missingSearchExclude.length == 0)
        {
            return;
        }
        if (missingFileExclude.length > 0)
        {
            settings["files.exclude"] = {
                ...excludedFromView,
                ...Object.fromEntries(missingFileExclude.map((key): [string, boolean] => [key, true]))
            };
        }
        if (missingSearchExclude.length > 0)
        {
            settings["search.exclude"] = {
                ...excludedFromSearch,
                ...Object.fromEntries(missingSearchExclude.map((key): [string, boolean] => [key, true]))
            };
        }

        await vscode.workspace.fs.writeFile(settingsPath, Buffer.from(JSON.stringify(settings, null, 4) + "\n"));
    }
}
