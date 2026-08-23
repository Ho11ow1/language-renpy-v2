import * as vscode from "vscode";
import * as Utils from "@utils/index";
import * as Src from "@src/index";

export class CompletionItemProvider implements vscode.CompletionItemProvider
{
    // BASIC stuff
    private readonly _varNameRegex: RegExp = /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.$/;
    private readonly _callJumpRegex: RegExp = /(?:^|\s)(?:call|jump)\s+([a-zA-Z0-9_]*)$/;
    private readonly _callShowScreenRegex: RegExp = /(?:^|\s)(?:call|show|hide)\s+screen\s+([a-zA-Z0-9_]*)$/;
    private readonly _labelRegex: RegExp = /^\s*(?:label)\s+/;
    private readonly _screenRegex: RegExp = /^\s*(?:screen)\s+/;

    // ATL stuff
    private readonly _showSceneHideRegex: RegExp = /(?:^|\s)(?:show|scene|hide)\s+([a-zA-Z0-9_]*)$/;
    private readonly _atRegex: RegExp = /(?:show|scene|hide)\s+\w+(?:\s+\w+)?\s+at\s+\w*$/;
    private readonly _withRegex: RegExp = /(?:(?:show|scene|hide)\s+\w+(?:\s+\w+)?(?:\s+at\s+\w+)?|show\s+screen\s+\w+)\s+with\s+\w*$/;

    // TBD stuff
    private readonly _styleRegex: RegExp = /(?:^|\s)style\s+([a-zA-Z0-9_]*)$/;
    private readonly _styleRegex2: RegExp = /\b\s+style./;

    private readonly _prefixSliceArray: Array<string> = new Array<string>("renpy.config", "renpy.gui", "renpy.achievement", "renpy.build");
    private readonly _noqaComment: vscode.CompletionItem = new vscode.CompletionItem("@NOQA", vscode.CompletionItemKind.Constant);

    // private readonly _baseStyleProperties = new Set<string>([
    //     // Position Style Properties
    //     "align",
    //     "alt",
    //     "anchor",
    //     "area",
    //     "maximum",
    //     "minimum",
    //     "offset",
    //     "pos",
    //     "xalign",
    //     "xanchor",
    //     "xcenter",
    //     "xfill",
    //     "xmaximum",
    //     "xminimum",
    //     "xoffset",
    //     "xpos",
    //     "xsize",
    //     "xysize",
    //     "yalign",
    //     "yanchor",
    //     "ycenter",
    //     "yfill",
    //     "ymaximum",
    //     "yminimum",
    //     "yoffset",
    //     "ypos",
    //     "ysize",
    //     "xycenter",

    //     // Text Style Properties
    //     "adjust_spacing",
    //     "alters_case",
    //     "antialias",
    //     "black_color",
    //     "bold",
    //     "caret",
    //     "color",
    //     "drop_shadow",
    //     "drop_shadow_color",
    //     "emoji",
    //     "first_indent",
    //     "font",
    //     "hinting",
    //     "hyperlink_functions",
    //     "italic",
    //     "justification",
    //     "kerning",
    //     "language",
    //     "layout",
    //     "line_leading",
    //     "line_spacing",
    //     "min_width",
    //     "newline_indent",
    //     "outlines",
    //     "outline_scaling",
    //     "prefer_line_break",
    //     "ruby_style",
    //     "scramble",
    //     "size",
    //     "strikethrough",
    //     "slow_abortable",
    //     "slow_cps",
    //     "slow_cps_multiplier",
    //     "text_align",
    //     "text_y_fudge",
    //     "underline",
    //     "vertical",
    //     "zero_width_spaces",

    //     // Window Style Properties
    //     "background",
    //     "fore_background",
    //     "foreground",
    //     "modal",

    //     // Margin Style Properties (Window/Button padding & margins)
    //     "bottom_margin",
    //     "bottom_padding",
    //     "left_margin",
    //     "left_padding",
    //     "margin",
    //     "padding",
    //     "right_margin",
    //     "right_padding",
    //     "top_margin",
    //     "top_padding",
    //     "xmargin",
    //     "xpadding",
    //     "ymargin",
    //     "ypadding",

    //     // Button Style Properties
    //     "activate_sound",
    //     "clipping",
    //     "hover_sound",
    //     "focus_mask",
    //     "key_events",
    //     "mouse",

    //     // Bar Style Properties
    //     "bar_resizing",
    //     "bar_vertical",
    //     "bar_invert",
    //     "base_bar",
    //     "thumb",
    //     "thumb_offset",
    //     "thumb_shadow",
    //     "left_bar",
    //     "right_bar",
    //     "top_bar",
    //     "bottom_bar",
    //     "left_gutter",
    //     "right_gutter",
    //     "top_gutter",
    //     "bottom_gutter",
    //     "unscrollable",
    //     "value",

    //     // Box Style Properties
    //     "box_reverse",
    //     "box_wrap",
    //     "box_wrap_spacing",
    //     "first_spacing",
    //     "spacing",

    //     // Grid Style Properties
    //     "xspacing",
    //     "yspacing",

    //     // Fixed Style Properties
    //     "fit_first"
    // ]);

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const lineText = document.lineAt(position).text.substring(0, position.character);

        //
        //  Special case for adding # @NOQA
        //
        if (lineText.trim().startsWith("#"))
        {
            Utils.Logger.logDebug("Autocomplete lookup for comment");

            return [this._noqaComment];
        }
        //
        // Handle the real auto-complete
        //
        if (lineText.endsWith("."))
        {
            const match = lineText.match(this._varNameRegex);
            if (match)
            {
                const originalPath = match[1];
                const targetPath = this.normalizeCompletionPath(originalPath);
                Utils.Logger.logDebug(`Tree autocomplete lookup for: "${originalPath}" -> "${targetPath}"`);

                const items = Src.Store.getCompletionsForPath(targetPath);
                return items.length > 0 ? items : undefined;
            }
        }
        //
        // Just showing immediate intellisense for a python line or renpy.Src.Store.
        //
        if (lineText.trim().startsWith("$") || lineText.trim().endsWith("=") || lineText.trim().endsWith(","))
        {
            Utils.Logger.logDebug("Autocomplete lookup for immediate");

            const items = Src.Store.getImmediateCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // Have to make this check to only activate if we are in a screen context later
        //
        if (this._styleRegex.test(lineText) || this._styleRegex2.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for: style");

            const items = Src.Store.getStyleCompletions.filter((i): boolean => i.kind !== vscode.CompletionItemKind.Method);
            return items.length > 0 ? items : undefined;
        }
        //
        // call | show screen -> show screens
        //
        if (this._callShowScreenRegex.test(lineText) || this._screenRegex.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for: call screen");

            const items = Src.Store.getScreenCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // jump | call -> show labels
        //
        if (this._callJumpRegex.test(lineText) || this._labelRegex.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for: jump | call");

            const items = Src.Store.getLabelCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  show -> show anything typed as an image: Image(), "images/*", Movie(), etc...
        //
        if (this._showSceneHideRegex.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for images");

            const items = Src.Store.getImageCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // show Jessica at -> show transforms
        //
        if (this._atRegex.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for at transforms");

            const items = Src.Store.getTransformCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        // show Jessica with -> show renpy builtins
        //
        if (this._withRegex.test(lineText))
        {
            Utils.Logger.logDebug("Autocomplete lookup for at transforms");

            const items = Src.Store.getTransitionCompletions;
            return items.length > 0 ? items : undefined;
        }
        //
        //  Need to handle screen & ATL syntax here at some point, probably after adding syntax / grammar
        //  Additionally should probably turn everything above into else if but we'll brun that bridge when we get there
        //  Also while we're at it split up the above section into pure py, atl & screen as show & at is technically ATL
        //
        // Potentially the best or worst solution? Going to leave it here now for testing as it does what it want it to, should find a better solution though for performance resaons

        return Src.Store.getImmediateCompletions;
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerCompletionItemProvider("renpy", this, ".", " ");
    }

    // Kind of a clunky way to do this but due to renpys complexity of:
    //  $ => essentially renpy.store
    // $ renpy.store => explicity renpy.store
    // $ config. => essentially renpy.config
    // $ renpy.config => explicity renpy.config
    // There's probably more but these are really the most important because of the intellisense lookup
    private normalizeCompletionPath(targetPath: string): string
    {
        if (targetPath.startsWith("renpy.store."))
        {
            return targetPath.substring("renpy.Store.".length);
        }
        if (this._prefixSliceArray.some((str): boolean => targetPath.startsWith(str)))
        {
            return targetPath.substring("renpy.".length);
        }

        return targetPath;
    }

    private getPreviousWord(lineText: string): string | undefined
    {
        const match = lineText.match(/(?:^|\s)([a-zA-Z_][a-zA-Z0-9_]*)\s+[a-zA-Z0-9_]*$/);

        return match ? match[1] : undefined;
    }
}
