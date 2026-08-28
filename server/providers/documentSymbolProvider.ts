import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

export class DocumentSymbolProvider
{
    public providerDocumentOutline(params: lsps.DocumentSymbolParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.DocumentSymbol[]
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

        const tempName = "Temp";

        return [
            {
                name: tempName,
                kind: lsps.SymbolKind.File,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: document.lineCount, character: 0 }
                },
                //
                //  SelectionRange does literally nothing as vscode just goes with the range to select but sure i guess, anything to make the interface gods happy
                //  Or maybe it does something specific which i just don't seem to catch
                //
                selectionRange: {
                    start: { line: 0, character: 0 },
                    end: { line: document.lineCount - 1, character: tempName.length }
                }
            }
        ];
    }
}
