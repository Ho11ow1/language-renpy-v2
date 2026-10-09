import * as lsps from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";
import { Store } from "@server/store";

export class HoverProvider
{
    private readonly _screenDeclRegex: RegExp = /^\s*screen\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private readonly _screenUsageRegex: RegExp = /\b(?:show|call|hide)\s+(?:screen)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;

    public provideHover(params: lsps.HoverParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.Hover | undefined
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return undefined;
        }

        const fullLine = document.getText({
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line + 1, character: 0 }
        });

        //
        //  TODO: Temp fix
        //
        let match: RegExpMatchArray | null = null;
        if ((match = fullLine.match(this._screenDeclRegex) ?? fullLine.match(this._screenUsageRegex)) !== null)
        {
            const screen = Store.getScreen(match[1]);
            if (screen)
            {
                return this.createComponent(screen);
            }
        }

        let node: Models.Node | undefined = undefined;

        if (!node)
        {
            return undefined;
        }
        //
        //  Get node context and node here later
        //

        return this.createComponent(node);
    }

    private createComponent(node: Models.Node): lsps.Hover
    {
        let builder = "";

        if (node.Location)
        {
            builder += `File: ${new URL(node.Location.uri).pathname.split("/game/")[1]} | Ln: ${node.Location.range.start.line + 1}\n\n`;
        }

        builder += `\`\`\`py\n${node.Detail}\n\`\`\`\n\n`;

        if (node.Documentation)
        {
            const formattedStr = node.Documentation
                .replace(/("{3}|'{3})/g, "")
                .split('\n')
                .map((str): string => str.trim())
                .join('\n')
                .replace(/("{3}|'{3})/g, "");

            builder += formattedStr;
        }

        return {
            contents: {
                kind: "markdown",
                value: builder
            },
            range: node.Range
        };
    }
}
