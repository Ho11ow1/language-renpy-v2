import * as vscode from "vscode";
import { ColorUtils } from "@utils/ColorUtils";

export class ColorProvider implements vscode.DocumentColorProvider
{
    // Patters
    private readonly hex: string = "#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})";
    private readonly byte: string = "(?:0|[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-5])";
    private readonly unit: string = "(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+)";
    private readonly color: string = "Color";

    // So turn out regex also has \(n) which backreferences the nth group

    // Just pure "#3/6/8"
    private readonly rawHex = new RegExp(`(["'\`])(${this.hex})\\1`, "g");
    // Color constructor args
    private readonly colorHLS = new RegExp(`${this.color}\\(\\s*hls=\\((${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)\\)`, "g");
    private readonly colorHSV = new RegExp(`${this.color}\\(\\s*hsv=\\((${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)\\)`, "g");
    private readonly colorRGB = new RegExp(`${this.color}\\(\\s*rgb=\\((${this.unit}\\s*,\\s*${this.unit}\\s*,\\s*${this.unit})\\)\\)`, "g");
    private readonly colorTuple = new RegExp(`${this.color}\\(\\s*\\((${this.byte}\\s*,\\s*${this.byte}\\s*,\\s*${this.byte}(?:\\s*,\\s*${this.byte})?)\\s*\\)\\)`, "g");
    // Character dialogue tag
    private readonly textTag = new RegExp(`{color=(${this.hex})}`, "g");

    public provideDocumentColors(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorInformation[]>
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const results: vscode.ColorInformation[] = [];
        const text = document.getText();
        let match: RegExpExecArray | null = null;

        while ((match = this.rawHex.exec(text)) !== null)
        {
            const hex = match[2];
            const color = ColorUtils.hexToColor(hex);

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }
        while ((match = this.colorHLS.exec(text)) !== null)
        {
            const hls = match[1];
            const color = ColorUtils.hlsToColor(hls);

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }
        while ((match = this.colorHSV.exec(text)) !== null)
        {
            const hsv = match[1];
            const color = ColorUtils.hsvToColor(hsv);

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }
        while ((match = this.colorRGB.exec(text)) !== null)
        {
            const rgb = match[1];
            const color = ColorUtils.rgbToColor(rgb);

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }
        while ((match = this.textTag.exec(text)) !== null)
        {
            const hex = match[1];
            const color = ColorUtils.hexToColor(hex);

            const startOffset = match.index + match[0].indexOf(hex);
            const start = document.positionAt(startOffset);
            const end = document.positionAt(startOffset + hex.length);

            results.push(new vscode.ColorInformation(new vscode.Range(start, end), color));
        }
        while ((match = this.colorTuple.exec(text)) !== null)
        {
            const tuple = match[1];
            const color = ColorUtils.tupleToColor(tuple);

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

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
