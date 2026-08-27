import * as vscode from "vscode";
import * as Utils from "@client/utils/logger";
import * as Common from "@common/variables";

export function withGlobalMiddleware<T>(endpointName: string, action: () => T): T
{
    const startTime = performance.now();

    try
    {
        return action();
    }
    finally
    {
        Utils.Logger.logDebug(`(${endpointName}) took ${(performance.now() - startTime).toFixed(2)}ms`);
    }
}

export function isLargeFile(document: vscode.TextDocument): boolean
{
    return (document.lineCount > Common.MAX_LINE_COUNT);
}
