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

    public getNodeAtPath(pathSegments: string[]): NamespaceNode | undefined
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

        return child.getNodeAtPath(tail);
    }

    public getImmediateCompletions(): vscode.CompletionItem[]
    {
        const items = [];

        for (const [key, childNode] of this.children.entries())
        {
            const kind = childNode.declaration?.kind ?? vscode.CompletionItemKind.Module;
            const item = new vscode.CompletionItem(key, kind);

            if (item.kind === vscode.CompletionItemKind.Class)
            {
                item.insertText = new vscode.SnippetString(`${key}($1)`);
                item.command = {
                    command: "editor.action.triggerParameterHints",
                    title: "Trigger Parameter hints"
                };
            }

            item.detail = childNode.declaration?.detail ?? `namespace ${key}`;
            if (childNode.declaration?.documentation)
            {
                item.documentation = new vscode.MarkdownString(childNode.declaration.documentation);
            }

            items.push(item);
        }

        for (const [key, decl] of this.members.entries())
        {
            if (decl.pythonType === "label" || decl.pythonType === "screen" || decl.pythonType === "transform" || decl.pythonType === "style" || decl.pythonType === "image")
            {
                continue;
            }
            if (decl.kind === vscode.CompletionItemKind.Class && key === this.name)
            {
                continue;
            }

            const item = new vscode.CompletionItem(key, decl.kind);

            item.detail = decl.detail;
            item.documentation = new vscode.MarkdownString(decl.documentation);
            if (item.kind === vscode.CompletionItemKind.Function || item.kind === vscode.CompletionItemKind.Method)
            {
                item.insertText = new vscode.SnippetString(`${key}($1)`);
                item.command = {
                    command: "editor.action.triggerParameterHints",
                    title: "Trigger Parameter hints"
                };
            }

            items.push(item);
        }

        return items;
    }

    public resetWorkspaceOverrides(filePath: string): void
    {
        for (const [key, decl] of this.members.entries())
        {
            if (decl.locationInfo?.filePath === filePath)
            {
                if (decl.isCustom)
                {
                    this.members.delete(key);
                }
                else
                {
                    decl.Reset();
                }
            }
        }

        for (const [key, childNode] of Array.from(this.children.entries()))
        {
            childNode.resetWorkspaceOverrides(filePath);

            if (childNode.declaration?.locationInfo?.filePath === filePath)
            {
                if (childNode.declaration.isCustom)
                {
                    if (childNode.members.size === 0 && childNode.children.size === 0)
                    {
                        this.children.delete(key);
                    }
                    else
                    {
                        childNode.declaration = undefined;
                    }
                }
                else
                {
                    childNode.declaration.Reset();
                }
            }
        }
    }
}
