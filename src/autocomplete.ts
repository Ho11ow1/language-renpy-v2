import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";

export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    // BASIC stuff
    private readonly varNameRegex: RegExp = /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.$/;
    private readonly callJumpRegex: RegExp = /(?:^|\s)(?:call|jump)\s+([a-zA-Z0-9_]*)$/;
    private readonly callShowScreenRegex: RegExp = /(?:^|\s)(?:call|show)\s+screen\s+([a-zA-Z0-9_]*)$/;

    // ATL stuff
    private readonly showRegex: RegExp = /(?:^|\s)show\s+([a-zA-Z0-9_]*)$/;

    // TBD stuff
    private readonly styleRegex: RegExp = /(?:^|\s)style\s+([a-zA-Z0-9_]*)$/;

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const lineText = document.lineAt(position).text.substring(0, position.character);

        //
        // Handle the real auto-complete
        //
        if (lineText.endsWith("."))
        {
            const match = lineText.match(this.varNameRegex);
            if (match)
            {
                const targetPath = match[1];
                Logger.logMessage(`Tree autocomplete lookup for: "${targetPath}"`);

                const items = Store.getCompletionsForPath(targetPath);
                return items.length > 0 ? items : undefined;
            }
        }
        //
        // Have to make this check to only activate if we are in a screen context later
        //
        if (this.styleRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: style");

            const items = Store.getStyleCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // call | show screen -> show screens
        //
        if (this.callShowScreenRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: call screen");

            const items = Store.getScreenCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // jump | call -> show labels
        //
        if (this.callJumpRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: jump | call");

            const items = Store.getLabelCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  show -> show anything typed as an image: Image(), "images/*", Movie(), etc...
        //
        if (this.showRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for images");

            const items = Store.getImageCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // show Jessica at -> show transforms
        //
        if (lineText.trim().endsWith("at"))
        {
            Logger.logMessage("Autocomplete lookup for at transforms");

            const items = Store.getTransformCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // Just showing immediate intellisense for a python line
        //
        if (lineText.trim().startsWith("$") || lineText.trim().endsWith("="))
        {
            Logger.logMessage("Autocomplete lookup for immediate");

            const items = Store.getImmediateCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  Need to handle screen & ATL syntax here at some point, probably after adding syntax / grammar
        //  Additionally should probably turn everything above into else if but we'll brun that bridge when we get there
        //  Also while we're at it split up the above section into pure py, atl & screen as show & at is technically ATL
        //

        return undefined;
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerCompletionItemProvider("renpy", this, ".", " ");
    }
}
