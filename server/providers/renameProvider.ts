import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Store } from "@server/store";

export class RenameProvider
{
    //
    //  Bad but leave for now so i have a base on what the selection logic should be like for images
    //
    private readonly _imageNameRegex: RegExp = /^(\s+(?:show|hide|scene)\s+)(.+?)(?=\s+(?:at|with|as|onlayer|zorder)\b|$)/i;

    public provideRename(params: lsps.RenameParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.WorkspaceEdit | undefined
    {
        if (token.isCancellationRequested)
        {
            return undefined;
        }

        return {};
    }

    public onPrepareRename(params: lsps.PrepareRenameParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.PrepareRenameResult | null
    {
        if (token.isCancellationRequested)
        {
            return null;
        }

        const document = documents.get(params.textDocument.uri);
        if (!document)
        {
            return null;
        }

        const lineIndex = params.position.line;
        const lineText = document.getText({
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex + 1, character: 0 }
        });

        const match = lineText.match(this._imageNameRegex);
        if (match && match[2])
        {
            const prefixOffset = match[1].length;
            const imageName = match[2];

            const startChar = prefixOffset;
            const endChar = prefixOffset + imageName.length;

            if (params.position.character >= startChar && params.position.character < endChar)
            {
                return { start: { line: lineIndex, character: startChar }, end: { line: lineIndex, character: endChar } };
            }
        }

        return { defaultBehavior: true };
    }
}
