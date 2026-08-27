import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as Utils from "@server/utils/index";

export class ColorProvider
{
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

    public provideDocumentColors(params: lsps.DocumentColorParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument> ): lsps.ColorInformation[]
    {
        if (token.isCancellationRequested)
        {
            return [];
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return [];
        }

        const results: lsps.ColorInformation[] = [];
        const text = document.getText();

        Utils.Logger.logMessage(`Random message`);

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

                results.push({ range: { start, end }, color });
                continue;
            }

            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);

            let color: lsps.Color;
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

            results.push({ range: { start, end }, color });
        }

        return results;
    }

    public provideColorPresentations(params: lsps.ColorPresentationParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.ColorPresentation[]
    {
        if (token.isCancellationRequested)
        {
            return [];
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return [];
        }

        const color = params.color;
        const range = params.range;

        const lineText = document.getText({
            start: { line: range.start.line, character: 0 },
            end: { line: range.start.line, character: range.end.character + 1}
        });

        const beforeTarget = lineText.slice(0, range.start.character);
        const afterTarget = lineText.slice(range.end.character);

        if (beforeTarget.endsWith("{color=") && afterTarget.startsWith("}"))
        {
            return [{ label: Utils.ColorUtils.colorToHEX(color) }];
        }
        else
        {
            return [
                { label: `"${Utils.ColorUtils.colorToHEX(color)}"` },
                { label: Utils.ColorUtils.colorToHLS(color) },
                { label: Utils.ColorUtils.colorToHSV(color) },
                { label: Utils.ColorUtils.colorToRGB(color) },
                { label: Utils.ColorUtils.colorToTuple(color) }
            ];
        }
    }
}
