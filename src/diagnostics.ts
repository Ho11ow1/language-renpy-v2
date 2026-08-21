import * as path from "path";
import * as vscode from "vscode";
import * as Utils from "@utils/index";
import * as Src from "@src/index";
import * as Config from "@config/index";

export class Diagnostics
{
    private static readonly _diagnosticsMap: Map<string, Array<vscode.Diagnostic>> = new Map<string, Array<vscode.Diagnostic>>();
    private static readonly _diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection("renpy");

    // INFORMATION stuff
    private static readonly _diagnosticGroupRegex: RegExp = /^[ \t]*#+[ \t]*(?<KIND>todo|warn|note|bug|fixme|fix|performance|perf)(?=\s|:|$)(?<TEXT>[ \t]*:?[ \t]*.*$)/gim;

    // SINGLE stuff
    private static readonly _tabRegex: RegExp = /\t+/;
    private static readonly _ignoreFileDiagnostics: string = "# @NOQA" as const;

    // ERROR stuff
    private static readonly _validFileNameRegex: RegExp = /^[a-zA-Z0-9][a-zA-Z0-9_.]*(?:_ren\.py|\.rpy)$/;
    private static readonly _invalidDefaultDefineRegex: RegExp = /^\s*(?:default|define)\s+(?<NAME>(?![a-zA-Z])[^\s=]+)/gmd;
    private static readonly _persistentUsageRegex: RegExp = /\bpersistent\.(?<KEY>[a-zA-Z0-9_]+)/g;

    // Fallback from docs, Outdated but it is what it is, we get the local sdk from path if provided for better stuff
    private static readonly _renpyReservedNamesListStatic: string[] = [
        "_autosave",
        "_confirm_quit",
        "_constant",
        "_dismiss_pause",
        "_game_menu_screen",
        "_greedy_rollback",
        "_history",
        "_history_list",
        "_ignore_action",
        "_menu",
        "_quit_slot",
        "_rollback",
        "_scene_show_hide_transition",
        "_screenshot_pattern",
        "_skipping",
        "_window",
        "_window_auto",
        "_window_subtitle"
    ];

    public static diagnoseFilename(filePath: string): vscode.Diagnostic | undefined
    {
        const fileName = path.basename(filePath);
        if (fileName.startsWith("00") || !this._validFileNameRegex.test(fileName))
        {
            return new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), "Filenames should begin with a number or letter but not with '00'", vscode.DiagnosticSeverity.Error);
        }

        return undefined;
    }

    public static generateDiagnostics(): void;
    public static generateDiagnostics(document: vscode.TextDocument): void;
    public static async generateDiagnostics(document?: vscode.TextDocument): Promise<void>
    {
        if (!document)
        {
            (await Utils.EditorUtils.getRenpyDocuments()).forEach((doc): void => this.generateDiagnostics(doc));
            return;
        }

        const filePath = document.uri.fsPath;
        const fileContent = document.getText();
        try
        {
            const diagnostics: Array<vscode.Diagnostic> = [];
            this._diagnosticsMap.set(filePath, diagnostics);

            const persistentKeys = Src.Store.getPersistentKeys;
            let match: RegExpExecArray | null = null;

            const fileNameDiagnostic = this.diagnoseFilename(document.uri.fsPath);
            if (fileNameDiagnostic)
            {
                diagnostics.push(fileNameDiagnostic);
            }
            if (document.lineAt(0).text.trim().toUpperCase() === this._ignoreFileDiagnostics)
            {
                this._diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
                return;
            }

            const tabSize = Utils.EditorUtils.getTabSize(document);

            this._diagnosticGroupRegex.lastIndex = 0;
            while ((match = this._diagnosticGroupRegex.exec(fileContent)) !== null && match.groups)
            {
                let kind = match.groups.KIND.toUpperCase();
                kind = (kind === "FIXME" ? "FIX" : (kind === "PERFORMANCE" ? "PERF" : kind));

                diagnostics.push(new vscode.Diagnostic(new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)), `${kind}: ${match.groups.TEXT.trim()}`, vscode.DiagnosticSeverity.Information));
            }

            this._invalidDefaultDefineRegex.lastIndex = 0;
            while ((match = this._invalidDefaultDefineRegex.exec(fileContent)) !== null && match.groups)
            {
                if (!match.groups.NAME.startsWith("__") && (Config.WorkspaceConfig.renpySdkReserved_Names.length > 0 ? !Config.WorkspaceConfig.renpySdkReserved_Names.includes(match.groups.NAME) : !this._renpyReservedNamesListStatic.includes(match.groups.NAME)))
                {
                    const [nameStart, nameEnd] = match.indices!.groups!.NAME!;

                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(document.positionAt(nameStart), document.positionAt(nameEnd)), `Variable names should start with a letter`, vscode.DiagnosticSeverity.Error));
                }
            }

            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++)
            {
                const line = document.lineAt(lineIndex).text;
                if (!line || line.trim().startsWith("#"))
                {
                    continue;
                }

                if (this._tabRegex.test(line))
                {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.length), "Ren'Py does not allow tabs, use Spaces", vscode.DiagnosticSeverity.Error));
                }

                //
                //  Very primitive indent check just watching out for a bad level rather than actually expected indent but it's ok for now
                //
                const lineIndent = line.length - line.trimStart().length;
                if (lineIndent % tabSize !== 0)
                {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineIndent + 1), "Inconsistent indent level", vscode.DiagnosticSeverity.Error));
                }

                const stray = this.checkStrayDollarSigns(line, lineIndex);
                if (stray)
                {
                    diagnostics.push(stray);
                }
                const persistentUsage = this.checkPersistentUsages(line, lineIndex, persistentKeys);
                if (persistentUsage)
                {
                    diagnostics.push(persistentUsage);
                }
            }

            this._diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
        }
        catch (ex)
        {
            Utils.Logger.logDebug(`Error generating diagnosrics for file ${filePath}: ${ex}`);
        }
    }

    public static removeNotifications(filePath: string): void;
    public static removeNotifications(): void;
    public static removeNotifications(filePath?: string): void
    {
        if (filePath !== undefined)
        {
            this._diagnosticsMap.delete(filePath);
            this._diagnosticCollection.delete(vscode.Uri.file(filePath));
        }
        else
        {
            this._diagnosticsMap.clear();
            this._diagnosticCollection.clear();
        }
    }

    public static getCollection(): vscode.DiagnosticCollection
    {
        return this._diagnosticCollection;
    }

    private static checkStrayDollarSigns(line: string, lineIndex: number): vscode.Diagnostic | undefined
    {
        const trimmed = line.trimStart();
        const leadingWhitespace = line.length - trimmed.length;

        let inString = false;
        let quoteChar = "";

        for (let i = 0; i < line.length; i++)
        {
            const c = line[i];

            if (inString)
            {
                if (c === "\\")
                {
                    i++;
                    continue;
                }
                if (c === quoteChar)
                {
                    inString = false;
                }
                continue;
            }

            if (c === "\"" || c === "'" || c === "`")
            {
                inString = true;
                quoteChar = c;
                continue;
            }

            if (c === "#")
            {
                break;
            }

            if (c === "$" && i !== leadingWhitespace)
            {
                return new vscode.Diagnostic(new vscode.Range(lineIndex, i, lineIndex, i + 1), "You can't use a $ in the middle of a line", vscode.DiagnosticSeverity.Error);
            }
        }
    }

    private static maskStringsAndComments(line: string): string
    {
        let masked = "";
        let inString = false;
        let quoteChar = "";

        for (let i = 0; i < line.length; i++)
        {
            const c = line[i];

            if (inString)
            {
                if (c === "\\")
                {
                    masked += "  ";
                    i++;
                    continue;
                }
                if (c === quoteChar)
                {
                    inString = false;
                }
                masked += " ";
                continue;
            }

            if (c === "\"" || c === "'" || c === "`")
            {
                inString = true;
                quoteChar = c;
                masked += " ";
                continue;
            }

            if (c === "#")
            {
                masked += " ".repeat(line.length - i);
                break;
            }

            masked += c;
        }

        return masked;
    }

    private static checkPersistentUsages(line: string, lineIndex: number, persistentKeys: Set<string>): vscode.Diagnostic | undefined
    {
        const masked = this.maskStringsAndComments(line);
        let match: RegExpExecArray | null = null;

        this._persistentUsageRegex.lastIndex = 0;
        while ((match = this._persistentUsageRegex.exec(masked)) !== null && match.groups)
        {
            const key = match.groups.KEY;
            if (persistentKeys.has(key))
            {
                continue;
            }

            const keyStart = match.index + "persistent.".length;
            const range = new vscode.Range(lineIndex, keyStart, lineIndex, keyStart + key.length);

            return new vscode.Diagnostic(range, `"persistent.${key}" is not defined anywhere.`, vscode.DiagnosticSeverity.Warning);
        }
    }
}
