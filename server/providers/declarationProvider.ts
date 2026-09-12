import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

export class DeclarationProvider
{
    public provideDeclaration(params: lsps.DeclarationParams, token: lsps.CancellationToken, documents: lsps.TextDocuments<TextDocument>): lsps.Declaration | undefined
    {
        return undefined;
    }
}
