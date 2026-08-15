import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Diagnostic } from "vscode";
import { Logger } from "@utils/Logger";

export class Diagnostics
{
    private static readonly diagnosticsMap: Map<string, Array<Diagnostic>> = new Map<string, Array<Diagnostic>>();
    private static readonly diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection("renpy");

    private static readonly fileSplitRegex: RegExp = /\r?\n/;

    private static readonly tabRegex: RegExp = /^\t+/;

    public static generateDiagnostics(filePath: string): void
    {
        if (!fs.existsSync(filePath))
        {
            return;
        }

        try
        {
            const diagnostics: Array<Diagnostic> = [];
            this.diagnosticsMap.set(filePath, diagnostics);

            const tabSize = this.getTabSize(filePath);
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const lines = fileContent.split(this.fileSplitRegex);

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++)
            {
                const line = lines[lineIndex];
                if (!line || line.trim().startsWith("#"))
                {
                    continue;
                }

                if (this.tabRegex.test(line))
                {
                    Logger.logMessage(`line: ${lineIndex} contains a tab`);
                    const range = new vscode.Range(lineIndex, 0, lineIndex, line.length);
                    const item = new Diagnostic(range, "Ren'Py does not allow the use of Tabs, use Spaces", vscode.DiagnosticSeverity.Error);
                    diagnostics.push(item);
                    continue;
                }

            }

            this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
        }
        catch (ex)
        {
            Logger.logMessage(`Error generating diagnosrics for file ${filePath}: ${ex}`);
        }
    }

    public static removeNotifications(filePath: string): void
    {
        this.diagnosticsMap.delete(filePath);
        this.diagnosticCollection.delete(vscode.Uri.file(filePath));
    }

    public static getCollection(): vscode.DiagnosticCollection
    {
        return this.diagnosticCollection;
    }

    //
    // Move this into a common because we also need this inside of the workspace parser instead of replacing regex with a 4x space
    //
    private static getTabSize(filePath: string): number
    {
        const uri = vscode.Uri.file(filePath);
        const editor = vscode.window.visibleTextEditors.find((e): boolean => e.document.uri.fsPath === uri.fsPath);
        if (editor && typeof editor.options.tabSize === "number")
        {
            return editor.options.tabSize;
        }

        return vscode.workspace.getConfiguration("editor", uri).get("tabSize") ?? 4;
    }
}
