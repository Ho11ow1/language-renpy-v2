import * as vscode from "vscode";
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Services from "@services/index";
import * as Utils from "@utils/index";
import * as Config from "@config/index";

export class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory
{
    public createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor>
    {
        if (Config.WorkspaceConfig.debuggerEnabled)
        {
            return new vscode.DebugAdapterInlineImplementation(new DebugAdapter());
        }
        else
        {
            return undefined;
        }
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.debug.registerDebugAdapterDescriptorFactory("renpy", this);
    }

    public static getDebugCommandDisposable(): vscode.Disposable
    {
        return vscode.commands.registerCommand("renpy.processRun", this.debugCommandCallback);
    }

    private static debugCommandCallback(): void
    {
        if (!Config.WorkspaceConfig.debuggerEnabled)
        {
            vscode.window.showWarningMessage("Ren'Py debugger is disabled.", "Open Settings").then((selection): void => {
                if (selection === "Open Settings")
                {
                    vscode.commands.executeCommand("workbench.action.openSettings", "renpy.debuggerEnabled");
                }
            });

            return;
        }
        if (vscode.debug.activeDebugSession?.type === "renpy")
        {
            return;
        }

        vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], {
            type: "renpy",
            request: "launch",
            name: "Ren'Py",
            noDebug: true,
            internalConsoleOptions: "neverOpen"
        });
    }
}

export class DebugAdapter implements vscode.DebugAdapter
{
    private readonly _processService = new Services.ProcessService();
    private readonly _messageEmitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
    private readonly _exitSub: vscode.Disposable;

    public readonly onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> = this._messageEmitter.event;

    private seq = 1;
    private terminatedSent = false;
    private suppressExit = false;

    constructor()
    {
        this._exitSub = this._processService.onProcessExit((): void => {
            if (!this.suppressExit)
            {
                this.sendTerminated();
            }
        });
    }

    public handleMessage(message: DebugProtocol.ProtocolMessage): void
    {
        if (message.type !== "request")
        {
            return;
        }

        const req = message as DebugProtocol.Request;

        switch (req.command)
        {
            case "initialize":
                this.onInitialize(req);
                break;

            case "launch":
                this.onLaunch(req);
                break;

            case "restart":
                this.onRestart(req);
                break;

            case "disconnect":
            case "terminate":
                this.onStop(req);
                break;

            default:
                this.sendResponse(req);
        }
    }

    public dispose(): void
    {
        this._exitSub.dispose();
    }

    private onInitialize(req: DebugProtocol.Request): void
    {
        this.sendResponse(req, { supportsRestartRequest: true });
        this.sendEvent("initialized");
    }

    private async onLaunch(req: DebugProtocol.Request): Promise<void>
    {
        try
        {
            await this._processService.Spawn();

            this.sendResponse(req);
        }
        catch (ex)
        {
            this.sendErrorResponse(req, `Failed to launch Ren'Py: ${ex}`);
        }
    }

    private async onRestart(req: DebugProtocol.Request): Promise<void>
    {
        this.suppressExit = true;

        try
        {
            await this._processService.Reload();
            this.sendResponse(req);
        }
        catch (ex)
        {
            this.sendErrorResponse(req, `Failed to restart Ren'Py: ${ex}`);
        }
        finally
        {
            this.suppressExit = false;
        }
    }

    private async onStop(req: DebugProtocol.Request): Promise<void>
    {
        await this._processService.Stop();

        this.sendResponse(req);
        this.sendTerminated();
    }

    private sendTerminated(): void
    {
        if (this.terminatedSent)
        {
            return;
        }

        this.terminatedSent = true;
        this.sendEvent("terminated");
    }

    private sendResponse(req: DebugProtocol.Request, body: any = {}): void
    {
        const response: DebugProtocol.Response = {
            seq: this.seq++,
            type: "response",
            request_seq: req.seq,
            success: true,
            command: req.command,
            body
        };

        this._messageEmitter.fire(response);
    }

    private sendErrorResponse(req: DebugProtocol.Request, message: string): void
    {
        Utils.Logger.logDebug(message);

        const response: DebugProtocol.Response = {
            seq: this.seq++,
            type: "response",
            request_seq: req.seq,
            success: false,
            command: req.command,
            message
        };

        this._messageEmitter.fire(response);
    }

    private sendEvent(name: string, body: any = {}): void
    {
        const evt: DebugProtocol.Event = {
            seq: this.seq++,
            type: "event",
            event: name,
            body
        };

        this._messageEmitter.fire(evt);
    }
}
