import * as vscode from "vscode";
import * as Src from "@src/index";
import * as Models from "@models/index";
import * as Parsers from "@parser/index";

export class DefinitionProvider implements vscode.DefinitionProvider
{
    private readonly _fullVarRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/;

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        const offset = position.character;

        const contextMatches = Parsers.ContextParser.tryGetDeclaration(line, offset);
        if (contextMatches)
        {
            const locations = contextMatches
                .filter((m): string | undefined => m.declaration.locationInfo?.filePath)
                .map((m): vscode.Location => this.getDefinitionComponent(m.declaration));

            if (locations.length > 0)
            {
                return locations;
            }
        }

        const wordRange = document.getWordRangeAtPosition(position, this._fullVarRegex);
        if (!wordRange)
        {
            return undefined;
        }

        const decl = Src.Store.getDeclarationAtPath(document.getText(wordRange).split("."));
        if (!decl || !decl?.locationInfo?.filePath)
        {
            return undefined;
        }

        return this.getDefinitionComponent(decl);
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerDefinitionProvider("renpy", this);
    }

    private getDefinitionComponent(decl: Models.Declaration): vscode.Location
    {
        const locationInfo = decl.locationInfo!;

        const split = decl.detail.split("\n");

        const range = new vscode.Range(
            (locationInfo.lineNumber - split.length),
            0,
            (locationInfo.lineNumber - split.length),
            (locationInfo.lineEndLen + split[0].length)
        );

        return new vscode.Location(vscode.Uri.file(locationInfo.filePath), range);
    }
}
