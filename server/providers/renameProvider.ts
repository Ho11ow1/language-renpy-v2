import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

export class RenameProvider
{
    public provideRename(params: lsps.RenameParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.WorkspaceEdit
    {
        return {
            changes: {
                "URI": [
                    {
                        range: { start: { line: 0, character: 6 }, end: { line: 0, character: 6 } },
                        newText: "X"
                    }
                ]
            }
        };
    }
}
