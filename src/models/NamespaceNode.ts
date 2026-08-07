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
            if (!childNode.declaration)
            {
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Module);
                item.detail = `Namespace: ${key}`;

                items.push(item);
            }
            else
            {
                items.push(childNode.declaration.AsCompletionItem());
            }
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

            items.push(decl.AsCompletionItem());
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
