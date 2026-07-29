import * as vscode from "vscode";


export class Logger
{
    public static outputChannel: vscode.LogOutputChannel = vscode.window.createOutputChannel("Ren'Py Language Extension", { log: true });
    public static statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
    
    private static MESSAGE_PREFIX = "[RENPY V2]" as const;

    public static LogMessage(msg: string): void
    {
        this.outputChannel.info(`${this.MESSAGE_PREFIX} | ${msg}`);
    }

    public static LogDebug(msg: string): void
    {
        this.outputChannel.debug(`${this.MESSAGE_PREFIX} | ${msg}`);
    }

    public static Clear(): void
    {
        this.outputChannel.clear();
    }

    public static UpdateStatusBar(msg: string): void
    {
        if (msg === "")
        {
            this.statusBar.hide();
        }

        this.statusBar.show();
        this.statusBar.text = msg;
    }

    
}
