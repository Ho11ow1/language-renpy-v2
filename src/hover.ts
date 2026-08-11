import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";

export class HoverItemProvider implements vscode.HoverProvider
{
    // Vars
    private identifierPartRegex: RegExp = /^[a-zA-Z0-9_]*/;
    private chainBeforeCursorRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*$/;

    // Primitive implementation, I'll have to build the ContextParser which will handle this, additionally definition.ts also needs to be fixed so that's ContextParser also
    // Also kind of have to handle both add img & add screen so this won't work here but should work in the context parser
    // We probably won't be supporting everything, and at the same time for something like add we should also allow functions like FileScreenShoto() but that requires json restructure which i have yet to add
    private imageDeclRegex: RegExp = /^\s*image\s+([a-zA-Z0-9_\s]+?)\s*[=:]\s*([\s\S]*)$/;
    private imageUsageRegex: RegExp = /\b(?:show|scene|hide)\s+(.+?)(?:\s+at\s+.+|:)?$/;
    private labelDeclRegex: RegExp = /^\s*label\s+(?!_\s*\()([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private labelUsageRegex: RegExp = /\b(?:jump|call)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;
    private transformDeclRegex: RegExp = /^\s*transform\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private transformUsageRegex: RegExp = /\b(?:show|scene|hide)(?:\s+screen)?\s+\w+(?:\s+\w+)?\s+(?:at)\s+([a-zA-Z0-9_]+)/;
    private screenDeclRegex: RegExp = /^\s*screen\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private screenUsage1Regex: RegExp = /\b(?:show|call|hide)\s+(?:screen)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;
    private screenUsage2Regex: RegExp = /\b(?:add)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?$/;

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
                const decl = Store.getDeclarationAtPath(["image", imageName]);
                if (decl)
                {
                    return this.getHoverComponent(decl, new vscode.Range(position.line, imageStart, position.line, imageEnd));
                }
            }
        }
        const labelDeclMatch = line.match(this.labelDeclRegex) ?? line.match(this.labelUsageRegex);
        if (labelDeclMatch)
        {
            const labelName = labelDeclMatch[1].trim();
            const labelStart = labelDeclMatch.index! + labelDeclMatch[0].indexOf(labelName);
            const labelEnd = labelStart + labelName.length;

            if (offset >= labelStart && offset <= labelEnd)
            {
                const decl = Store.getDeclarationAtPath(["label", labelName]);
                if (decl)
                {
                    return this.getHoverComponent(decl, new vscode.Range(position.line, labelStart, position.line, labelEnd));
                }
            }
        }
        const transformDeclMatch = line.match(this.transformDeclRegex) ?? line.match(this.transformUsageRegex);
        if (transformDeclMatch)
        {
            const transformName = transformDeclMatch[1].trim();
            const transformStart = transformDeclMatch.index! + transformDeclMatch[0].indexOf(transformName);
            const transformEnd = transformStart + transformName.length;

            if (offset >= transformStart && offset <= transformEnd)
            {
                const decl = Store.getDeclarationAtPath(["transform", transformName]);
                if (decl)
                {
                    return this.getHoverComponent(decl, new vscode.Range(position.line, transformStart, position.line, transformEnd));
                }
            }
        }
        const screenDeclMatch = line.match(this.screenDeclRegex) ?? line.match(this.screenUsage1Regex) ?? line.match(this.screenUsage2Regex);
        if (screenDeclMatch)
        {
            const screenName = screenDeclMatch[1].trim();
            const screenStart = screenDeclMatch.index! + screenDeclMatch[0].indexOf(screenName);
            const screenEnd = screenStart + screenName.length;

            if (offset >= screenStart && offset <= screenEnd)
            {
                const decl = Store.getDeclarationAtPath(["screen", screenName]);
                if (decl)
                {
                    return this.getHoverComponent(decl, new vscode.Range(position.line, screenStart, position.line, screenEnd));
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

        return new vscode.Hover(str, wordRange);
    }
}
