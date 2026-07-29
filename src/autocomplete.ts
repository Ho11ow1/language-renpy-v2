import { Logger } from "@utils/logger";
import * as vscode from "vscode";


export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested) { return undefined;}
        const cursorPrefix = document.lineAt(position).text.substring(0, position.character);

        const txt = cursorPrefix.replace("$", "").trim();
        Logger.LogMessage(`Running through auto-complete: ${txt}`);

        // Handle static namespaces
        if (cursorPrefix.endsWith("gui."))
        {
            return this.GetGuiCompletions();
        }
        if (cursorPrefix.endsWith("config."))
        {
            return this.GetConfigCompletions();
        }

        // Nothing more to give
        return undefined;
    }

    public GetDisposable(): vscode.Disposable
    {
        return vscode.languages.registerCompletionItemProvider(
            "renpy",
            this,
            ".",
            " "
        );
    }

    private GetGuiCompletions(): vscode.CompletionItem[]
    {
        const accentColor = new vscode.CompletionItem("accent_color", vscode.CompletionItemKind.Variable);
        accentColor.detail = `define gui.accent_color = "#cc0066"`;
        accentColor.documentation = new vscode.MarkdownString("An accent color");

        const textColor = new vscode.CompletionItem("text_color", vscode.CompletionItemKind.Variable);
        textColor.detail = `define gui.text_color = "#FFFFFF"`;
        textColor.documentation = new vscode.MarkdownString("Color of regular text");

        return [accentColor, textColor];
    }

    private GetConfigCompletions(): vscode.CompletionItem[]
    {
        const name = new vscode.CompletionItem("name", vscode.CompletionItemKind.Property);
        name.detail = `define config.name = _("RenTale"")`;
        name.documentation = new vscode.MarkdownString("Name of the game.");

        const version = new vscode.CompletionItem("version", vscode.CompletionItemKind.Property);
        version.detail = "define config.version = 1.0";
        version.documentation = new vscode.MarkdownString("Version string displayed in the interface.");

        return [name, version];
    }

    
}
