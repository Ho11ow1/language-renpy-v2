import * as vscode from "vscode";

export class WorkspaceConfig
{
    public static renpySdkReserved_Names: string[] = [];

    //
    //  renpySdkPath: renpy.exe "path" run (Docs say to go through lib/ but there's no need)
    //  renpySdkPath: renpy.sh "path" run
    //

    public static get diagnosticsEnabled(): boolean
    {
        return vscode.workspace.getConfiguration("renpy").get<boolean>("diagnosticsEnabled", true);
    }

    public static get limitedPython(): boolean
    {
        return vscode.workspace.getConfiguration("renpy").get<boolean>("limitedPythonRoot", true);
    }

    public static get sdkPath(): string
    {
        return vscode.workspace.getConfiguration("renpy").get<string>("sdkPath", "");
    }
}
