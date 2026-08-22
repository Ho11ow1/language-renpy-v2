import * as vscode from "vscode";
import * as Models from "@models/index";
import * as Config from "@config/index";
import * as Data from "@data/index";

export class NamespaceNode
{
    public name: string;
    public declaration?: Models.Declaration;
    public occurences?: Models.LocationInfo[];              // For the outline view we need to exist but a declaration doesn't actually need to be there
    public children: Map<string, NamespaceNode> = new Map();// Holds continuous node chains: classes, namespaces
    public members: Map<string, Models.Declaration> = new Map();   // Holds direct objects: property, variable, method

    public constructor(name: string, declaration?: Models.Declaration)
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
        const undesired = new Set<string>(["label", "screen", "screen", "transform", "style", "image", "action", "transition", "image"]);

        for (const [key, childNode] of this.children.entries())
        {
            if (!childNode.declaration)
            {
                if (undesired.has(key))
                {
                    continue;
                }
                const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Module);
                item.detail = `Namespace: ${key}`;

                items.push(item);
            }
            else
            {
                items.push(childNode.declaration?.AsCompletionItem());
            }
        }

        for (const [key, decl] of this.members.entries())
        {
            if (decl.kind === vscode.CompletionItemKind.Class && key === this.name)
            {
                continue;
            }
            if (Config.WorkspaceConfig.limitedPython && !decl.isCustom && decl.kind === vscode.CompletionItemKind.Function && Data.pythonRootFunctions.has(decl) && !Data.limitedPythonRootFunctions.has(decl))
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
