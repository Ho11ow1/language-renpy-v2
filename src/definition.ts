import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";

export class DefinitionProvider implements vscode.DefinitionProvider
{
    private fullVarRegex: RegExp = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*/;

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position, this.fullVarRegex);
        if (!wordRange)
        {
            return undefined;
        }

        const decl = Store.getDeclarationAtPath(document.getText(wordRange).split("."));
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

    private getDefinitionComponent(decl: Declaration): vscode.Location
    {
        const locationInfo = decl.locationInfo!;

        return new vscode.Location(vscode.Uri.file(locationInfo.filePath), new vscode.Range(new vscode.Position(locationInfo.lineNumber - 1, 0), new vscode.Position(locationInfo.lineNumber - 1, locationInfo.lineEndLen)));
    }
}
