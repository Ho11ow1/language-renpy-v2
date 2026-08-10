import * as vscode from "vscode";

export interface ISelectionContext
{
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    text: string
}
