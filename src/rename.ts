import * as vscode from "vscode";

export class RenameProvider implements vscode.RenameProvider
{
    provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit>
    {
        const workspaceEdit = new vscode.WorkspaceEdit();

        workspaceEdit.replace(vscode.Uri.file("a"), new vscode.Range(0, 0, 0, 0), newName);

        return workspaceEdit;
    }

    prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string; }>
    {
        const range = new vscode.Range(0, 0, 0, 0);
        const placeholder = "Placeholder";

        return {range, placeholder};
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerRenameProvider("renpy", this);
    }
}
