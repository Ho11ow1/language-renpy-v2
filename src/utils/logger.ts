import * as vscode from "vscode";

export class Logger
{
    public static outputChannel: vscode.LogOutputChannel = vscode.window.createOutputChannel("Ren'Py Language Extension", { log: true });
    public static statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);

    private static MESSAGE_PREFIX: string = "[RENPY V2]" as const;

    public static logMessage(msg: string): void
    {
        this.outputChannel.info(`${this.MESSAGE_PREFIX} | ${msg}`);
    }

    public static logDebug(msg: string): void
    {
        this.outputChannel.debug(`${this.MESSAGE_PREFIX} | ${msg}`);
    }

    public static clear(): void
    {
        this.outputChannel.clear();
    }

    public static updateStatusBar(msg: string, icon?: string): void
    {
        if (msg === "")
        {
            this.statusBar.hide();
        }

        this.statusBar.show();
        this.statusBar.text = `${icon !== undefined ? icon : ""} ${msg}`;
    }
}
