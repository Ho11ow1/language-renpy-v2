import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";

export class HoverItemProvider implements vscode.HoverProvider
{
    private identifierPartRegex: RegExp = /^[a-zA-Z0-9_]*/;
    private chainBeforeCursorRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*$/;
    private imageDeclRegex: RegExp = /^\s*image\s+([a-zA-Z0-9_\s]+?)\s*[:=]/;
    private imageUsageRegex: RegExp = /\b(?:show|scene|hide)\s+(.+?)(?=\s+at\b|$)/;
    private renpyStorePrefix: string = "renpy.store.";

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        const offset = position.character;

        const imageDeclMatch = line.match(this.imageUsageRegex) ?? line.match(this.imageDeclRegex);
        if (imageDeclMatch)
        {
            const imageName = imageDeclMatch[1].trim();
            const imageStart = imageDeclMatch.index! + imageDeclMatch[0].indexOf(imageName);
            const imageEnd = imageStart + imageName.length;

            if (offset >= imageStart && offset <= imageEnd)
            {
                const decl = Store.getDeclarationAtPath([/*"image",*/ imageName]);
                if (decl)
                {
                    return this.getHoverComponent(decl, new vscode.Range(position.line, imageStart, position.line, imageEnd));
                }
            }
        }

        const backwardMatch = line.substring(0, offset).match(this.chainBeforeCursorRegex);
        if (!backwardMatch)
        {
            return undefined;
        }

        const matchText = backwardMatch[0].startsWith(this.renpyStorePrefix) ? backwardMatch[0].substring(this.renpyStorePrefix.length) : backwardMatch[0];
        const forwardMatch = line.substring(offset).match(this.identifierPartRegex);
        const restOfWord = forwardMatch ? forwardMatch[0] : "";

        const decl = Store.getDeclarationAtPath(`${matchText}${restOfWord}`.split("."));
        if (!decl)
        {
            return undefined;
        }

        return this.getHoverComponent(decl, new vscode.Range(position.line, ((offset - backwardMatch[0].length) + (backwardMatch[0].startsWith(this.renpyStorePrefix) ? this.renpyStorePrefix.length : 0)), position.line, (offset + restOfWord.length)));
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

        return new vscode.Hover(str, wordRange)
    }
}
