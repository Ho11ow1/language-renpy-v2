import * as vscode from "vscode";

export class Logger
{
    public static readonly _outputChannel: vscode.LogOutputChannel = vscode.window.createOutputChannel("Ren'Py Language Extension", { log: true });
    public static readonly _statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);

    private static readonly _messagePrefix: string = "[Ren'Py v2 LSP Client]";

    public static logMessage(msg: string): void
    {
        this._outputChannel.info(`${this._messagePrefix} | ${msg}`);
    }

    public static logDebug(msg: string): void
    {
        this._outputChannel.debug(`${this._messagePrefix} | ${msg}`);
    }

    public static clear(): void
    {
        this._outputChannel.clear();
    }

    public static updateStatusBar(msg: string, icon?: string): void
    {
        if (msg === "")
        {
            this._statusBar.hide();
        }

        this._statusBar.show();
        this._statusBar.text = `${icon !== undefined ? icon : ""} ${msg}`;
    }
}
