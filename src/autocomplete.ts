import { Logger } from "@utils/Logger";
import { Store } from "@src/store";
import * as vscode from "vscode";

export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    // Label stuff
    private readonly callJumpRegex: RegExp = /(?:^|\s)(?:call|jump)\s+([a-zA-Z0-9_]*)$/;

    // Screen stuff
    private readonly callShowScreenRegex: RegExp = /(?:^|\s)(?:call|show)\s+screen\s+([a-zA-Z0-9_]*)$/;

    // Image stuff
    private readonly showRegex: RegExp = /(?:^|\s)show\s+([a-zA-Z0-9_]*)$/;

    // TBD stuff
    private readonly styleRegex: RegExp = /(?:^|\s)style\s+([a-zA-Z0-9_]*)$/;

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const cursorPrefix = document.lineAt(position).text.substring(0, position.character);

        //
        // Handle the real auto-complete
        //
        if (cursorPrefix.endsWith("."))
        {
            const cleanPrefix = cursorPrefix.replace("$", "").slice(0, -1).trim();
            Logger.logMessage(`Tree autocomplete lookup for: "${cleanPrefix}"`);

            const items = Store.getCompletionsForPath(cleanPrefix);
            return items.length > 0 ? items : undefined;
        }
        //
        // Have to make this check to only activate if we are in a screen context later
        //
        if (this.styleRegex.test(cursorPrefix))
        {
            Logger.logMessage("Autocomplete lookup for: style");

            const items = Store.getStyleCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // call | show screen -> show screens
        //
        if (this.callShowScreenRegex.test(cursorPrefix))
        {
            Logger.logMessage("Autocomplete lookup for: call screen");

            const items = Store.getScreenCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // jump | call -> show labels
        //
        if (this.callJumpRegex.test(cursorPrefix))
        {
            Logger.logMessage("Autocomplete lookup for: jump | call");

            const items = Store.getLabelCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  show -> show anything typed as an image: Image(), "images/*", Movie(), etc...
        //
        if (this.showRegex.test(cursorPrefix))
        {
            Logger.logMessage("Autocomplete lookup for images");

            const items = Store.getImageCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // show Jessica at -> show transforms
        //
        if (cursorPrefix.trim().endsWith("at"))
        {
            Logger.logMessage("Autocomplete lookup for at transforms");

            const items = Store.getTransformCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // Just showing immediate intellisense for a python line
        //
        if (cursorPrefix.trim().startsWith("$"))
        {
            Logger.logMessage("Autocomplete lookup for immediate");

            const items = Store.getImmediateCompletions;
            return items.length > 0 ? items : undefined;
        }

        return undefined;
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerCompletionItemProvider("renpy", this, ".", " ");
    }
}
