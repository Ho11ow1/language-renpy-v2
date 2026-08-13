import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { Store } from "@src/store";

export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    // BASIC stuff
    private readonly varNameRegex: RegExp = /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.$/;
    private readonly callJumpRegex: RegExp = /(?:^|\s)(?:call|jump)\s+([a-zA-Z0-9_]*)$/;
    private readonly callShowScreenRegex: RegExp = /(?:^|\s)(?:call|show|hide)\s+screen\s+([a-zA-Z0-9_]*)$/;
    private readonly labelRegex: RegExp = /^\s*(?:label)\s+/; // Give users a hint for label\s+ so they know their current labels ex: Label_Home_Bedroom => Label_Home_Backyard is still needed to be implemented
    private readonly screenRegex: RegExp = /^\s*(?:screen)\s+/; // Give users a hint for screen\s+ so they know their current screens ex: Navigation_Home_Bedroom => Navigation_Home_Backyard is still needed to be implemented

    // ATL stuff
    private readonly showSceneHideRegex: RegExp = /(?:^|\s)(?:show|scene|hide)\s+([a-zA-Z0-9_]*)$/;
    private readonly atRegex: RegExp = /(?:show|scene|hide)(?:\s+screen)?\s+\w+(?:\s+\w+)?\s+at\s+\w*$/;

    // TBD stuff
    private readonly styleRegex: RegExp = /(?:^|\s)style\s+([a-zA-Z0-9_]*)$/;
    private readonly styleRegex2: RegExp = /\b\s+style./;

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const lineText = document.lineAt(position).text.substring(0, position.character);

        //
        // Have to make this check to only activate if we are in a screen context later
        //
        if (this.styleRegex.test(lineText) || this.styleRegex2.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: style");

            const items = Store.getStyleCompletions.filter(i => i.kind !== vscode.CompletionItemKind.Method); // We don't want style.rebuild to show for this
            return items.length > 0 ? items : undefined;
        }
        //
        // call | show screen -> show screens
        //
        if (this.callShowScreenRegex.test(lineText) || this.screenRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: call screen");

            const items = Store.getScreenCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // jump | call -> show labels
        //
        if (this.callJumpRegex.test(lineText) || this.labelRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for: jump | call");

            const items = Store.getLabelCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  show -> show anything typed as an image: Image(), "images/*", Movie(), etc...
        //
        if (this.showSceneHideRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for images");

            const items = Store.getImageCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // show Jessica at -> show transforms
        //
        if (this.atRegex.test(lineText))
        {
            Logger.logMessage("Autocomplete lookup for at transforms");

            const items = Store.getTransformCompletions;
            return items.length > 0 ? items : undefined;
        }
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
        // Just showing immediate intellisense for a python line or renpy.store.
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
