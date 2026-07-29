import { Logger } from "@utils/logger";
import * as vscode from "vscode";

export class HoverItemProvider implements vscode.HoverProvider
{
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover>
    {
        if (token.isCancellationRequested) { return undefined;}

        // Get the thing we are hovering over, e.g. rentale.all_items
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) { return undefined; }

        const word = document.getText(wordRange);
        const lineText = document.lineAt(position.line).text;

        // Example
        Logger.LogDebug(`Word: ${word} | lineText: ${lineText}`);
        return new vscode.Hover(new vscode.MarkdownString(`define gui.text_color = "#FFFFFF"`));

        return undefined;
    }

    public GetDisposable(): vscode.Disposable
    {
        return vscode.languages.registerHoverProvider(
            "renpy",
            this
        );
    }


}
