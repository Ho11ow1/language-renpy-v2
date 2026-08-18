import * as vscode from "vscode";
import * as Utils from "@utils/index";

export class ColorProvider implements vscode.DocumentColorProvider
{
    // Patterns
    private readonly _hex: string = "#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})";
    private readonly _byte: string = "(?:0|[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-5])";
    private readonly _unit: string = "(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+)";
    private readonly _color: string = "Color";

    private readonly _groupedRegex = new RegExp(
        `(?<RAWHEX_QUOTE>["'\`])(?<RAWHEX>${this._hex})\\k<RAWHEX_QUOTE>` +
        `|${this._color}\\(\\s*hls=\\((?<HLS>${this._unit}\\s*,\\s*${this._unit}\\s*,\\s*${this._unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_HLS>${this._unit})\\s*)?\\)` +
        `|${this._color}\\(\\s*hsv=\\((?<HSV>${this._unit}\\s*,\\s*${this._unit}\\s*,\\s*${this._unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_HSV>${this._unit})\\s*)?\\)` +
        `|${this._color}\\(\\s*rgb=\\((?<RGB>${this._unit}\\s*,\\s*${this._unit}\\s*,\\s*${this._unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_RGB>${this._unit})\\s*)?\\)` +
        `|${this._color}\\(\\s*\\((?<TUPLE>${this._byte}\\s*,\\s*${this._byte}\\s*,\\s*${this._byte}(?:\\s*,\\s*${this._byte})?)\\s*\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_TUPLE>${this._unit})\\s*)?\\)` +
        `|{color=(?<TAG>${this._hex})}`,
        "g"
    );

    public provideDocumentColors(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorInformation[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const results: vscode.ColorInformation[] = [];
        const text = document.getText();

        let match: RegExpExecArray | null = null;
        while ((match = this._groupedRegex.exec(text)) !== null && match.groups)
        {
            const groups = match.groups;

            if (groups.TAG)
            {
                const hex = groups.TAG;
                const color = Utils.ColorUtils.hexToColor(hex);

                const startOffset = match.index + match[0].indexOf(hex);
                const start = document.positionAt(startOffset);
                const end = document.positionAt(startOffset + hex.length);

                results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
                continue;
            }

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            let color: vscode.Color;
            if (groups.RAWHEX !== undefined)
            {
                color = Utils.ColorUtils.hexToColor(groups.RAWHEX);
            }
            else if (groups.HLS !== undefined)
            {
                color = Utils.ColorUtils.hlsToColor(groups.HLS, groups.ALPHA_HLS);
            }
            else if (groups.HSV !== undefined)
            {
                color = Utils.ColorUtils.hsvToColor(groups.HSV, groups.ALPHA_HSV);
            }
            else if (groups.RGB !== undefined)
            {
                color = Utils.ColorUtils.rgbToColor(groups.RGB, groups.ALPHA_RGB);
            }
            else
            {
                color = Utils.ColorUtils.tupleToColor(groups.TUPLE, groups.ALPHA_TUPLE);
            }

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }

        return results;
    }

    public provideColorPresentations(color: vscode.Color, context: { readonly document: vscode.TextDocument; readonly range: vscode.Range; }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const line = context.document.lineAt(context.range.start.line).text;
        const beforeTarget = line.slice(0, context.range.start.character);
        const afterTarget = line.slice(context.range.end.character);

        // Only need the special case for the text tag as everything else plays nicely with the Color class
        if (beforeTarget.endsWith("{color=") && afterTarget.startsWith("}"))
        {
            return [new vscode.ColorPresentation(Utils.ColorUtils.colorToHEX(color))];
        }
        else
        {
            return [
                new vscode.ColorPresentation(`"${Utils.ColorUtils.colorToHEX(color)}"`),
                new vscode.ColorPresentation(Utils.ColorUtils.colorToHLS(color)),
                new vscode.ColorPresentation(Utils.ColorUtils.colorToHSV(color)),
                new vscode.ColorPresentation(Utils.ColorUtils.colorToRGB(color)),
                new vscode.ColorPresentation(Utils.ColorUtils.colorToTuple(color))
            ];
        }
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerColorProvider("renpy", this);
    }
}
