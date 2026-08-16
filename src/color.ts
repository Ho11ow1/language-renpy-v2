import * as vscode from "vscode";
import { ColorUtils } from "@utils/ColorUtils";

export class ColorProvider implements vscode.DocumentColorProvider
{
    // Patters
    private readonly hex: string = "#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})";
    private readonly byte: string = "(?:0|[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-5])";
    private readonly unit: string = "(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+)";
    private readonly color: string = "Color";

    private readonly groupedRegex = new RegExp(
        `(?<RAWHEX_QUOTE>["'\`])(?<RAWHEX>${this.hex})\\k<RAWHEX_QUOTE>` +
        `|${this.color}\\(\\s*hls=\\((?<HLS>${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_HLS>${this.unit})\\s*)?\\)` +
        `|${this.color}\\(\\s*hsv=\\((?<HSV>${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_HSV>${this.unit})\\s*)?\\)` +
        `|${this.color}\\(\\s*rgb=\\((?<RGB>${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_RGB>${this.unit})\\s*)?\\)` +
        `|${this.color}\\(\\s*\\((?<TUPLE>${this.byte}\\s*,\\s*${this.byte}\\s*,\\s*${this.byte}(?:\\s*,\\s*${this.byte})?)\\s*\\)(?:\\s*,\\s*alpha\\s*=\\s*(?<ALPHA_TUPLE>${this.unit})\\s*)?\\)` +
        `|{color=(?<TAG>${this.hex})}`,
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

        while ((match = this.groupedRegex.exec(text)) !== null && match.groups)
        {
            const groups = match.groups;

            if (groups.TAG)
            {
                const hex = groups.TAG;
                const color = ColorUtils.hexToColor(hex);

                const startOffset = match.index + match[0].indexOf(hex);
                const start = document.positionAt(startOffset);
                const end = document.positionAt(startOffset + hex.length);

                results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
                continue;
            }

            // Turns out that pre-calculating these is slightly better than doing them inline for whatever reason so yeah
            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            const color =
                groups.RAWHEX !== undefined ? ColorUtils.hexToColor(groups.RAWHEX) :
                groups.HLS !== undefined ? ColorUtils.hlsToColor(groups.HLS, groups.ALPHA_HLS) :
                groups.HSV !== undefined ? ColorUtils.hsvToColor(groups.HSV, groups.ALPHA_HSV) :
                groups.RGB !== undefined ? ColorUtils.rgbToColor(groups.RGB, groups.ALPHA_RGB) :
                ColorUtils.tupleToColor(groups.TUPLE, groups.ALPHA_TUPLE);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }

        return results;
    }

    public provideColorPresentations(color: vscode.Color, context: { readonly document: vscode.TextDocument; readonly range: vscode.Range; }, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]>
    {
        const line = context.document.lineAt(context.range.start.line).text;
        const beforeTarget = line.slice(0, context.range.start.character);
        const afterTarget = line.slice(context.range.end.character);

        // Only need the special case for the text tag as everything else plays nicely with the Color class
        if (beforeTarget.endsWith("{color=") && afterTarget.startsWith("}"))
        {
            return [new vscode.ColorPresentation(ColorUtils.colorToHEX(color))];
        }
        else
        {
            return [
                new vscode.ColorPresentation(`"${ColorUtils.colorToHEX(color)}"`),
                new vscode.ColorPresentation(ColorUtils.colorToHLS(color)),
                new vscode.ColorPresentation(ColorUtils.colorToHSV(color)),
                new vscode.ColorPresentation(ColorUtils.colorToRGB(color)),
                new vscode.ColorPresentation(ColorUtils.colorToTuple(color))
            ];
        }
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerColorProvider("renpy", this);
    }
}
