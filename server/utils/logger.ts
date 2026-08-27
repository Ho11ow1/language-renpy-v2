import * as lsps from "vscode-languageserver/node";

export class Logger
{
    private static connectionConsole: lsps.RemoteConsole | undefined = undefined;
    private static readonly _messagePrefix: string = "[Ren'Py v2 LS]";

    public static init(console: lsps.RemoteConsole): void
    {
        if (!this.connectionConsole)
        {
            this.connectionConsole = console;
        }
    }

    public static logMessage(msg: string): void
    {
        this.connectionConsole?.info(`${this._messagePrefix} | ${msg}`);
    }

    public static logDebug(msg: string): void
    {
        this.connectionConsole?.debug(`${this._messagePrefix} | ${msg}`);
    }
}
