import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import * as vscode from "vscode";

export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    private readonly jumpRegex: RegExp = new RegExp("(?:^|\\s)jump\\s+([a-zA-Z0-9_]*)$");
    private readonly callScreenRegex: RegExp = new RegExp("(?:^|\\s)call\\s+screen\\s+([a-zA-Z0-9_]*)$");
    private readonly callRegex: RegExp = new RegExp("(?:^|\\s)call\\s+([a-zA-Z0-9_]*)$");

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const cursorPrefix = document.lineAt(position).text.substring(0, position.character);

        // Handle the real auto-complete
        if (cursorPrefix.endsWith("."))
        {
            const cleanPrefix = cursorPrefix.replace("$", "").slice(0, -1).trim();
            Logger.LogMessage(`Tree autocomplete lookup for: "${cleanPrefix}"`);

            const items = Store.GetCompletionsForPath(cleanPrefix);
            return items.length > 0 ? items : undefined;
        }
        // call screen -> show screens
        if (this.callScreenRegex.test(cursorPrefix))
        {
            Logger.LogMessage("Autocomplete lookup for: call screen");
            const items = Store.GetScreenCompletions();
            return items.length > 0 ? items : undefined;
        }
        // jump | call -> show labels
        if (this.jumpRegex.test(cursorPrefix) || this.callRegex.test(cursorPrefix))
        {
            Logger.LogMessage("Autocomplete lookup for: jump | call");
            const items = Store.GetLabelCompletions();
            return items.length > 0 ? items : undefined;
        }
        // show Jessica at -> show transforms
        if (cursorPrefix.trim().endsWith("at"))
        {
            Logger.LogMessage("Autocomplete lookup for at transforms");
            const items = Store.GetTransformCompletions();
            return items.length > 0 ? items : undefined;
        }
        // Just showing immediate intellisense for a python line
        if (cursorPrefix.trim().startsWith("$"))
        {
            Logger.LogMessage("Autocomplete lookup for immediate variables/namespaces");
            const items = Store.GetImmediateCompletions();
            return items.length > 0 ? items : undefined;
        }

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
}
