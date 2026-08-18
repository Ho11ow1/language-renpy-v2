import * as path from "path";
import * as vscode from "vscode";
import * as Models from "@models/index";
import * as Src from "@src/index";
import * as Parsers from "@parser/index";

export class HoverItemProvider implements vscode.HoverProvider
{
    // Vars
    private readonly _identifierPartRegex: RegExp = /^[a-zA-Z0-9_]*/;
    private readonly _chainBeforeCursorRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*$/;

    private readonly _renpyStorePrefix: string = "renpy.store.";

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        const offset = position.character;

        //
        //  In theory this is bad but hover can only ever give you one so yeah, this should be enough
        //
        const contextMatches = Parsers.ContextParser.tryGetDeclaration(line, offset);
        if (contextMatches)
        {
            const match = contextMatches[0];
            const range = new vscode.Range(position.line, match.start, position.line, match.end);

            return this.getHoverComponent(match.declaration, range);
        }

        const backwardMatch = line.substring(0, offset).match(this._chainBeforeCursorRegex);
        if (!backwardMatch)
        {
            return undefined;
        }

        const matchText = backwardMatch[0].startsWith(this._renpyStorePrefix) ? backwardMatch[0].substring(this._renpyStorePrefix.length) : backwardMatch[0];
        const forwardMatch = line.substring(offset).match(this._identifierPartRegex);
        const restOfWord = forwardMatch ? forwardMatch[0] : "";

        let decl = Src.Store.getDeclarationAtPath(`${matchText}${restOfWord}`.split("."));
        if (!decl)
        {
            const fullSplit = `${matchText}${restOfWord}`.split(".");
            decl = Src.Store.getDeclarationAtPath([fullSplit[0], fullSplit[1]]);
            if (!decl)
            {
                decl = Src.Store.getDeclarationAtPath([matchText]);
                if (!decl)
                {
                    return undefined;
                }
            }
        }

        return this.getHoverComponent(decl, new vscode.Range(position.line, ((offset - backwardMatch[0].length) + (backwardMatch[0].startsWith(this._renpyStorePrefix) ? this._renpyStorePrefix.length : 0)), position.line, (offset + restOfWord.length)));
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerHoverProvider("renpy", this);
    }

    private getHoverComponent(decl: Models.Declaration, wordRange: vscode.Range): vscode.Hover
    {
        // May aswell support icons, might be nice to have in the future. Use empty constructor if not
        const str = new vscode.MarkdownString(undefined, true);
        str.isTrusted = true;

        if (decl.locationInfo)
        {
            const { filePath, lineNumber } = decl.locationInfo;
            const openArgs = encodeURIComponent(JSON.stringify([
                vscode.Uri.file(filePath),
                { selection: new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0) }
            ]));

            str.appendMarkdown(`*(Custom)* | [${path.basename(filePath)}:${lineNumber}](${`command:vscode.open?${openArgs}`})\n\n`);
        }
        else
        {
            str.appendMarkdown(`*(Internal)*\n\n`);
        }

        str.appendCodeblock(decl.detail, "python");

        if (decl.documentation)
        {
            str.appendMarkdown(`\n\n${decl.documentation}`);
        }

        return new vscode.Hover(str, wordRange);
    }
}
