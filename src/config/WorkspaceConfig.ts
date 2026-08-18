import * as vscode from "vscode";

export class WorkspaceConfig
{
    public static get diagnosticsEnabled(): boolean
    {
        return vscode.workspace.getConfiguration("renpy").get<boolean>("diagnosticsEnabled", true);
    }

    public static get limitedPython(): boolean
    {
        return vscode.workspace.getConfiguration("renpy").get<boolean>("limitedPythonRoot", true);
    }
}
