import * as lsps from "vscode-languageserver/node";
import * as Utils from "@server/utils/index";
import { Store } from "@server/store";

export class DocumentSymbolProvider
{
    public providerDocumentOutline(params: lsps.DocumentSymbolParams, token: lsps.CancellationToken): lsps.DocumentSymbol[]
    {
        if (token.isCancellationRequested)
        {
            return [];
        }

        return Store.getNodesForDocument(Utils.DocumentUtils.normalizeUri(params.textDocument.uri)).map((node): lsps.DocumentSymbol => node.toDocumentSymbol());
    }
}
