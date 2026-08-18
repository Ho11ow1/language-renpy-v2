import * as vscode from "vscode";
import * as Src from "@src/index";
import * as Models from "@models/index";

export class SignatureHelpProvider implements vscode.SignatureHelpProvider
{
    private readonly _funcParamRegex: RegExp = /\(([^)]*)\)/;
    private readonly _funcParamSplitRegex: RegExp = /,/g;
    private readonly _funcArgsNoStringRegex: RegExp = /"[^"]*"?|'[^']*'?/g;
    private readonly _funcNameBeforeParenRegex: RegExp = /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*$/;

    public provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const lineText = document.lineAt(position.line).text.substring(0, position.character);

        const openParenIndex = this.getDeepestParenthesisIndex(lineText);
        if (openParenIndex === -1)
        {
            return undefined;
        }

        const textBeforeParen = lineText.substring(0, openParenIndex);
        const funcMatch = textBeforeParen.match(this._funcNameBeforeParenRegex);
        if (!funcMatch)
        {
            return undefined;
        }

        const decl = Src.Store.getDeclarationAtPath(funcMatch[1].split("."));
        if (!decl)
        {
            return undefined;
        }

        const innermostArgs = lineText.substring(openParenIndex + 1);
        const argsWithoutStrings = innermostArgs.replace(this._funcArgsNoStringRegex, "");// Needed else param count will be off because strings can have ','
        const activeParamIndex = (argsWithoutStrings.match(this._funcParamSplitRegex) || []).length;

        return this.getSignatureComponent(activeParamIndex, decl);
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerSignatureHelpProvider({ scheme: "file", language: "renpy" }, this, "(", ",");
    }

    private getSignatureComponent(activeParamIndex: number, decl: Models.Declaration): vscode.SignatureHelp
    {
        let targetDetail = decl.detail;
        if (decl.kind === vscode.CompletionItemKind.Class)
        {
            targetDetail = decl.constructorDetail ?? `${decl.name.split(".").pop()}()`;
        }

        const paramMatch = targetDetail.match(this._funcParamRegex);
        const rawParams = paramMatch ? paramMatch[1] : "";
        const paramsArr = rawParams.split(",").map((p): string => p.trim()).filter((p): boolean => p !== "self" && p !== "cls" && p.length > 0);


        const signatureInfo = new vscode.SignatureInformation(targetDetail, decl.documentation ? new vscode.MarkdownString(decl.documentation) : undefined);
        signatureInfo.parameters = paramsArr.map((p): vscode.ParameterInformation => new vscode.ParameterInformation(p));

        const signatureHelp = new vscode.SignatureHelp();
        signatureHelp.signatures = [signatureInfo];
        signatureHelp.activeSignature = 0;
        signatureHelp.activeParameter = Math.min(activeParamIndex, Math.max(0, paramsArr.length - 1));

        return signatureHelp;
    }

    private getDeepestParenthesisIndex(lineText: string): number
    {
        let depth = 0;

        for (let i = lineText.length - 1; i >= 0; i--)
        {
            const char = lineText[i];
            if (char === ")")
            {
                depth++;
            }
            else if (char === "(")
            {
                if (depth > 0)
                {
                    depth--;
                }
                else
                {
                    return i;
                }
            }
        }

        return -1;
    }
}
