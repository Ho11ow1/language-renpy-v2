import * as path from "path";
import * as vscode from "vscode";
import * as Utils from "@utils/index";
import * as Src from "@src/index";
import * as Config from "@config/index";
import * as Interfaces from "@interfaces/index";

export class Diagnostics
{
    private static readonly _diagnosticsMap: Map<string, Array<vscode.Diagnostic>> = new Map<string, Array<vscode.Diagnostic>>();
    private static readonly _diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection("renpy");

    // INFORMATION stuff
    private static readonly _diagnosticGroupRegex: RegExp = /[ \t]*#+[ \t]*(?<KIND>todo|warn|note|bug|fixme|fix|performance|perf)(?=\s|:|$)(?<TEXT>[ \t]*:?[ \t]*.*$)/gim;

    // SINGLE stuff
    private static readonly _tabRegex: RegExp = /\t+/;
    private static readonly _ignoreFileDiagnostics: string = "# @NOQA" as const;

    // ERROR stuff
    private static readonly _validFileNameRegex: RegExp = /^[a-zA-Z0-9][a-zA-Z0-9_.]*(?:_ren\.py|\.rpy)$/;
    private static readonly _invalidDefaultDefineRegex: RegExp = /^\s*(?:default|define)\s+(?:(?<OFFSET>-?\d+)\s+(?<NAME_OFFSET>[^\s=]+)|(?<NAME_NOOFFSET>[^\s=]+))\s*=/gmd;
    private static readonly _isValidNameRegex: RegExp = /^[a-zA-Z]/;
    private static readonly _startsWithNumber: RegExp = /^\d/;
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
                const name = match.groups.NAME_OFFSET ?? match.groups.NAME_NOOFFSET;
                const nameIndices = match.indices!.groups!.NAME_OFFSET ?? match.indices!.groups!.NAME_NOOFFSET;

                if (!this._isValidNameRegex.test(name) && !name.startsWith("__") && (Config.WorkspaceConfig.renpySdkReserved_Names.length > 0 ? !Config.WorkspaceConfig.renpySdkReserved_Names.includes(name) : !this._renpyReservedNamesListStatic.includes(name)))
                {
                    const [nameStart, nameEnd] = nameIndices!;

                    //
                    //  Probably redundant and i'll probably remove it later but error is a compilation error so i guess it's also kind of good
                    //
                    if (this._startsWithNumber.test(name))
                    {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(document.positionAt(nameStart), document.positionAt(nameEnd)), `Variable names should start with a letter`, vscode.DiagnosticSeverity.Error));
                    }
                    else
                    {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(document.positionAt(nameStart), document.positionAt(nameEnd)), `Variable names should start with a letter`, vscode.DiagnosticSeverity.Warning));
                    }
                }
                if (match.groups.OFFSET !== undefined && match.groups.OFFSET.replace("-", "").length > 3)
                {
                    const [offsetStart, offsetEnd] = match.indices!.groups!.OFFSET!;

                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(document.positionAt(offsetStart), document.positionAt(offsetEnd)), `Variable offset range should be between -999 and 999`, vscode.DiagnosticSeverity.Warning));
                }
            }

            const indentationState: Interfaces.IDiagnosticIndentState = {
                indentStack: [0],
                bracketDepth: 0,
                isContinuedLine: false,
                pendingBlockOpen: false,
                pendingBlockIndent: -1,
                pendingBlockLineIndex: -1,
                currentLogicLineIndent: 0
            };

            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++)
            {
                const line = document.lineAt(lineIndex).text;
                if (!line || line.trim().startsWith("#"))
                {
                    continue;
                }

                diagnostics.push(...this.checkIndentationLine(lineIndex, line, tabSize, indentationState));
                diagnostics.push(...this.checkStrayDollarSigns(line, lineIndex));   // No real reason to make these destructure an array but style consistency
                diagnostics.push(...this.checkPersistentUsages(line, lineIndex));   // No real reason to make these destructure an array but style consistency
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

    //
    //  Ident logic based off of: https://github.com/python/cpython/blob/main/Lib/tokenize.py
    //  With the additon of mismatched indentation while not strictly needed it's nice to keep style consistent
    //
    private static checkIndentationLine(lineIndex: number, line: string, tabSize: number, state: Interfaces.IDiagnosticIndentState): vscode.Diagnostic[]
    {
        const diagnostics: vscode.Diagnostic[] = [];

        if (this._tabRegex.test(line))
        {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.length), "Ren'Py does not allow tabs, use Spaces", vscode.DiagnosticSeverity.Error));
        }

        const isLogicalLineStart = state.bracketDepth === 0 && !state.isContinuedLine;
        const masked = this.maskStringsAndComments(line);

        if (isLogicalLineStart)
        {
            const lineIndent = line.length - line.trimStart().length;
            state.currentLogicLineIndent = lineIndent;

            if (state.pendingBlockOpen)
            {
                if (lineIndent <= state.pendingBlockIndent)
                {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineIndent), `Expected an indented block after line ${state.pendingBlockLineIndex + 1}`, vscode.DiagnosticSeverity.Error));
                }
                state.pendingBlockOpen = false;
            }

            const currentLevel = state.indentStack[state.indentStack.length - 1];

            if (lineIndent > currentLevel)
            {
                state.indentStack.push(lineIndent);

                const delta = lineIndent - currentLevel;
                if (delta % tabSize !== 0)
                {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineIndent), `Indent is ${delta} space(s) deep, which doesn't match the configured indent size of ${tabSize}`, vscode.DiagnosticSeverity.Warning));
                }
            }
            else if (lineIndent < currentLevel)
            {
                while (state.indentStack.length > 1 && state.indentStack[state.indentStack.length - 1] > lineIndent)
                {
                    state.indentStack.pop();
                }

                if (state.indentStack[state.indentStack.length - 1] !== lineIndent)
                {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineIndent), "Unindent does not match any outer indentation level", vscode.DiagnosticSeverity.Error));
                    state.indentStack.push(lineIndent);
                }
            }
        }

        for (const ch of masked)
        {
            if (ch === "(" || ch === "[" || ch === "{")
            {
                state.bracketDepth++;
            }
            else if (ch === ")" || ch === "]" || ch === "}")
            {
                state.bracketDepth = Math.max(0, state.bracketDepth - 1);
            }
        }
        state.isContinuedLine = masked.trimEnd().endsWith("\\");

        if (state.bracketDepth === 0 && !state.isContinuedLine && masked.trimEnd().endsWith(":"))
        {
            state.pendingBlockOpen = true;
            state.pendingBlockIndent = state.currentLogicLineIndent;
            state.pendingBlockLineIndex = lineIndex;
        }

        return diagnostics;
    }

    private static checkStrayDollarSigns(line: string, lineIndex: number): vscode.Diagnostic[]
    {
        const diagnostics: vscode.Diagnostic[] = [];
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
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(lineIndex, i, lineIndex, i + 1), "You can't use a $ in the middle of a line", vscode.DiagnosticSeverity.Error));
            }
        }

        return diagnostics;
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

    private static checkPersistentUsages(line: string, lineIndex: number): vscode.Diagnostic[]
    {
        const diagnostics: vscode.Diagnostic[] = [];
        const persistentKeys = Src.Store.getPersistentKeys;
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

            diagnostics.push(new vscode.Diagnostic(range, `"persistent.${key}" is not defined anywhere.`, vscode.DiagnosticSeverity.Warning));
        }

        return diagnostics;
    }
}
