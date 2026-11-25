import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as Config from "@client/config/index";
import * as Utils from "@client/utils/index";

export class ProcessService
{
    private process: cp.ChildProcess | undefined = undefined;
    private exitEmitter = new vscode.EventEmitter<void>();
    private outputEmitter = new vscode.EventEmitter<string>();

    public readonly onProcessExit = this.exitEmitter.event;
    public readonly onOutput = this.outputEmitter.event;

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
            this.process = cp.spawn(exe, [...Config.WorkspaceConfig.processArgs, root, "run"], { cwd: Config.WorkspaceConfig.sdkPath, stdio: ["ignore", "pipe", "pipe"] });

            this.SetupListeners();
        }
        catch (ex)
        {
            Utils.Logger.logMessage(`Failed to spawn process | ${ex}`);

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
            Utils.Logger.logMessage("Connection Opened");

            resolve();
        });
    }

    private async OnClose(code: number | null, signal: NodeJS.Signals | null): Promise<void>
    {
        return new Promise((resolve): void => {
            Utils.Logger.logMessage(code !== null ? `Connection closed with code: ${code}` : `Connection closed via signal: ${signal ?? "unknown"}`);

            this.process = undefined;
            this.exitEmitter.fire();
            resolve();
        });
    }

    private async OnError(err: Error): Promise<void>
    {
        return new Promise((resolve): void => {
            Utils.Logger.logMessage(`Connection ran into an error: ${err.message}`);

            this.process = undefined;
            this.exitEmitter.fire();
            resolve();
        });
    }

    private SetupListeners(): void
    {
        this.process!.stdout?.on("data", (data: Buffer): void => {
            this.outputEmitter.fire(data.toString());
        });

        this.process!.stderr?.on("data", (data: Buffer): void => {
            this.outputEmitter.fire(data.toString());
        });

        this.process!.once("spawn", (): Promise<void> => this.OnStart());
        this.process!.once("close", (err, signal): Promise<void> => this.OnClose(err, signal));
        this.process!.once("error", (err): Promise<void> => this.OnError(err));
    }
}
