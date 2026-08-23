import * as vscode from "vscode";
import * as Src from "@src/index";
import * as Models from "@models/index";

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider
{
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[]
    {
        if (token.isCancellationRequested)
        {
            return [];
        }

        return this.getDocumentSymbolsRecursive(Src.Store.getTree, document.uri.fsPath);
    }

    public getDisposable(): vscode.Disposable
    {
        return vscode.languages.registerDocumentSymbolProvider("renpy", this);
    }

    private getDocumentSymbolsRecursive(node: Models.NamespaceNode, fsPath: string, parentPrefix: string = ""): vscode.DocumentSymbol[]
    {
        const declaration = node.declaration;
        const occurrence = node.occurences?.find((occurrence): boolean => occurrence.filePath === fsPath);
        const isClass = declaration?.kind === vscode.CompletionItemKind.Class;
        const isNamespace = !declaration && occurrence !== undefined;
        let container: vscode.DocumentSymbol | undefined = undefined;

        if (isClass && declaration.locationInfo?.filePath === fsPath)
        {
            container = this.toDocumentSymbol(declaration);
            container.name = this.getNodeLocalName(container.name, parentPrefix);
        }
        else if (isNamespace)
        {
            const range = new vscode.Range(
                occurrence!.lineNumber - 1,
                0,
                occurrence!.lineNumber - 1,
                occurrence!.lineEndLen
            );

            container = new vscode.DocumentSymbol(
                this.getNodeLocalName(node.name, parentPrefix),
                "",
                vscode.SymbolKind.Namespace,
                range,
                range
            );
        }

        const children: vscode.DocumentSymbol[] = [];
        const currentPrefix = (isClass || isNamespace) ? this.getNodePrefix(node.name, parentPrefix) : parentPrefix;

        for (const decl of node.members.values())
        {
            if (decl.locationInfo?.filePath !== fsPath)
            {
                continue;
            }

            const symbol = this.toDocumentSymbol(decl);
            symbol.name = this.getNodeLocalName(symbol.name, currentPrefix);

            children.push(symbol);
        }
        for (const childNode of node.children.values())
        {
            children.push(...this.getDocumentSymbolsRecursive(childNode, fsPath, currentPrefix));
        }

        if (container)
        {
            container.children.push(...children);

            return [container];
        }

        return children;
    }

    private toDocumentSymbol(decl: Models.Declaration): vscode.DocumentSymbol
    {
        const locationInfo = decl.locationInfo!;
        const split = decl.detail.split("\n");

        const range = new vscode.Range(
            (locationInfo.lineNumber - split.length),
            0,
            (locationInfo.lineNumber - split.length),
            (locationInfo.lineEndLen + split[0].length)
        );

        return new vscode.DocumentSymbol(
            decl.name,
            "",
            this.itemAsSymbolKind(decl.kind),
            range,
            range
        );
    }

    private itemAsSymbolKind(kind: vscode.CompletionItemKind): vscode.SymbolKind
    {
        switch (kind)
        {
            case vscode.CompletionItemKind.Method:
                return vscode.SymbolKind.Method;

            case vscode.CompletionItemKind.Function:
                return vscode.SymbolKind.Function;

            case vscode.CompletionItemKind.Class:
                return vscode.SymbolKind.Class;

            case vscode.CompletionItemKind.Property:
                return vscode.SymbolKind.Property;

            case vscode.CompletionItemKind.Field:
                return vscode.SymbolKind.Field;

            case vscode.CompletionItemKind.Variable:
                return vscode.SymbolKind.Variable;

            case vscode.CompletionItemKind.Constant:
                return vscode.SymbolKind.Constant;

            case vscode.CompletionItemKind.Enum:
                return vscode.SymbolKind.Enum;

            case vscode.CompletionItemKind.Module:
                return vscode.SymbolKind.Namespace;

            default:
                return vscode.SymbolKind.Variable;
        }
    }

    private getNodePrefix(nodeName: string, parentPrefix: string): string
    {
        if (!parentPrefix)
        {
            return nodeName;
        }
        if (nodeName === parentPrefix || nodeName.startsWith(`${parentPrefix}.`))
        {
            return nodeName;
        }

        return `${parentPrefix}.${nodeName}`;
    }

    private getNodeLocalName(name: string, prefix: string): string
    {
        if (!prefix)
        {
            return name;
        }

        const prefixWithSeparator = `${prefix}.`;
        if (name.startsWith(prefixWithSeparator))
        {
            return name.substring(prefixWithSeparator.length);
        }

        return name;
    }
}
