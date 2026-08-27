import * as vscode from "vscode";

export class WorkspaceConfig
{
    private static get config(): vscode.WorkspaceConfiguration
    {
        return vscode.workspace.getConfiguration("renpy");
    }

    public static get diagnosticsEnabled(): boolean
    {
        return this.config.get<boolean>("diagnosticsEnabled", true);
    }

    public static get limitedPython(): boolean
    {
        return this.config.get<boolean>("limitedPythonRoot", false);
    }

    public static get sdkPath(): string
    {
        return this.config.get<string>("sdkPath", "");
    }

    public static get debuggerEnabled(): boolean
    {
        return this.config.get<boolean>("debuggerEnabled", true);
    }
}
