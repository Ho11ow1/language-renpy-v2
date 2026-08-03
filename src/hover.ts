import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";

export class HoverItemProvider implements vscode.HoverProvider
{
    private fullVarRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/;

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        // Specific regex because getWordRange only returns full.split(".").at(-1) giving us the last word
        const wordRange = document.getWordRangeAtPosition(position, this.fullVarRegex);
        if (!wordRange)
        {
            return undefined;
        }

        const decl = Store.getDeclarationAtPath(document.getText(wordRange).split("."));
        if (!decl)
        {
            return undefined;
        }

        return this.getHoverComponent(decl, wordRange);
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerHoverProvider("renpy", this);
    }

    private getHoverComponent(decl: Declaration, wordRange: vscode.Range): vscode.Hover
    {
        const str = new vscode.MarkdownString();
        str.isTrusted = true;

        if (!decl.isCustom || !decl.locationInfo)
        {
            str.appendMarkdown(`*(Internal)*\n\n`);
        }
        else
        {
            const { filePath, lineNumber } = decl.locationInfo;
            const openArgs = encodeURIComponent(JSON.stringify([
                vscode.Uri.file(filePath),
                { selection: new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0) }
            ]));

            str.appendMarkdown(`*(Custom)* | [${path.basename(filePath)}:${lineNumber}](${`command:vscode.open?${openArgs}`})\n\n`);
        }

        str.appendCodeblock(decl.detail, "python");

        if (decl.documentation)
        {
            str.appendMarkdown(`\n\n${decl.documentation}`);
        }

        return new vscode.Hover(str, wordRange);
    }
}
