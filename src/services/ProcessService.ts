import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as Config from "@config/index";
import * as Utils from "@utils/index";

export class ProcessService
{
    private process: cp.ChildProcess | undefined = undefined;
    private exitEmitter = new vscode.EventEmitter<void>();

    public readonly onProcessExit = this.exitEmitter.event;

    public async Spawn(): Promise<void>
    {
        if (!Config.WorkspaceConfig.sdkPath || this.process !== undefined)
        {
            return;
        }

        const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!root)
        {
            return;
        }

        const exe = path.join(Config.WorkspaceConfig.sdkPath, process.platform === "win32" ? "renpy.exe" : "renpy.sh");
        try
        {
            this.process = cp.spawn(exe, ["--compile", root, "run"], { cwd: Config.WorkspaceConfig.sdkPath });

            this.SetupListeners();
        }
        catch (ex)
        {
            Utils.Logger.logDebug(`Failed to spawn process | ${ex}`);

            this.process = undefined;
        }
    }

    public Stop(): Promise<void>
    {
        return new Promise((resolve): void => {
            if (!this.process)
            {
                resolve();
                return;
            }

            const sub = this.onProcessExit((): void => {
                sub.dispose();
                resolve();
            });

            this.process.kill("SIGTERM");
        });
    }

    public async Reload(): Promise<void>
    {
        await this.Stop();
        await this.Spawn();
    }

    private async OnStart(): Promise<void>
    {
        return new Promise((resolve): void => {
            Utils.Logger.logDebug("Connection Opened");

            resolve();
        });
    }

    private async OnClose(code: number | null, signal: NodeJS.Signals | null): Promise<void>
    {
        return new Promise((resolve): void => {
            Utils.Logger.logDebug(code !== null ? `Connection closed with code: ${code}` : `Connection closed via signal: ${signal ?? "unknown"}`);

            this.process = undefined;
            this.exitEmitter.fire();
            resolve();
        });
    }

    private async OnError(err: Error): Promise<void>
    {
        return new Promise((resolve): void => {
            Utils.Logger.logDebug(`Connection ran into an error: ${err.message}`);

            this.process = undefined;
            this.exitEmitter.fire();
            resolve();
        });
    }

    private SetupListeners(): void
    {
        this.process!.once("spawn", (): Promise<void> => this.OnStart());
        this.process!.once("close", (err, signal): Promise<void> => this.OnClose(err, signal));
        this.process!.once("error", (err): Promise<void> => this.OnError(err));
    }
}
