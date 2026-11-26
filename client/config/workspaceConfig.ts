import * as vscode from "vscode";

export class WorkspaceConfig
{
    private static configSaveDirectory: string | undefined = undefined;

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

    public static get debugArgs(): string[]
    {
        return this.config.get<string[]>("debugArguments", []);
    }

    public static get lintArgs(): string[]
    {
        return this.config.get<string[]>("lintArguments", []);
    }

    public static get debuggerEnabled(): boolean
    {
        return this.config.get<boolean>("debuggerEnabled", true);
    }

    public static setFsSaveDirectory(dir: string): void
    {
        this.configSaveDirectory = dir;
    }

    public static get fsSaveDirectory(): string | undefined
    {
        return this.configSaveDirectory;
    }
}
