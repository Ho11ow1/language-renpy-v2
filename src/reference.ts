import * as vscode from "vscode";

export class ReferenceProvider implements vscode.ReferenceProvider
{
    public provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location[]>
    {
        return [
            new vscode.Location(vscode.Uri.file("a"), new vscode.Range(0, 0, 0, 0)),
            new vscode.Location(vscode.Uri.file("b"), new vscode.Range(0, 0, 0, 0)),
            new vscode.Location(vscode.Uri.file("c"), new vscode.Range(0, 0, 0, 0)),
        ]      
    }
 
    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerReferenceProvider("renpy", this);
    }
}
