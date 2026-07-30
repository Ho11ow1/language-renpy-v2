import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";

export class NamespaceNode
{
    public name: string;
    public declaration?: Declaration;
    public children: Map<string, NamespaceNode> = new Map();// Holds continuous node chains: classes, namespaces
    public members: Map<string, Declaration> = new Map();   // Holds direct objects: property, variable, method

    public constructor(name: string, declaration?: Declaration)
    {
        this.name = name;
        this.declaration = declaration;
    }

    public GetNodeAtPath(pathSegments: string[]): NamespaceNode | undefined
    {
        if (pathSegments.length === 0)
        {
            return this;
        }

        const [head, ...tail] = pathSegments;
        const child = this.children.get(head);

        if (!child)
        {
            return undefined;
        }

        return child.GetNodeAtPath(tail);
    }

    public GetImmediateCompletions(): vscode.CompletionItem[]
    {
        const items = [];

        for (const [key, childNode] of this.children.entries())
        {
            const kind = childNode.declaration?.kind ?? vscode.CompletionItemKind.Module;
            const item = new vscode.CompletionItem(key, kind);
            item.detail = childNode.declaration?.detail ?? `namespace ${key}`;
            if (childNode.declaration?.documentation)
            {
                item.documentation = new vscode.MarkdownString(childNode.declaration.documentation);
            }
            items.push(item);
        }

        for (const [key, decl] of this.members.entries())
        {
            if (decl.pythonType === "label" || decl.pythonType === "screen" || decl.pythonType === "transform")
            {
                continue;
            }

            const item = new vscode.CompletionItem(key, decl.kind);
            item.detail = decl.detail;
            if (decl.documentation)
            {
                item.documentation = new vscode.MarkdownString(decl.documentation);
            }
            items.push(item);
        }

        return items;
    }

    public ResetWorkspaceOverrides(filePath: string): void
    {
        for (const [_, decl] of this.members.entries())
        {
            if (decl.locationInfo?.filePath === filePath)
            {
                decl.Reset();
            }
        }

        for (const child of this.children.values())
        {
            child.ResetWorkspaceOverrides(filePath);
        }
    }
}
