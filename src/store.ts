import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";
import { NamespaceNode } from "@models/NamespaceNode";
import { IStaticJsonItem } from "@interfaces/IStaticJsonItem";
import { Logger } from "@utils/Logger";
import renpyJson from "@data/renpy.json";

//
// TODO: Clean this up or just add regions
//
export class Store
{
    private static rootNode: NamespaceNode = new NamespaceNode("root");
    private static typeAliasMap: Map<string, string> = new Map<string, string>();

    public static Initialize(): void
    {
        this.typeAliasMap.clear();

        const data = renpyJson as Record<string, Record<string, IStaticJsonItem>>;
        for (const [topLevelKey, items] of Object.entries(data))
        {
            const nsNode = new NamespaceNode(topLevelKey);
            this.rootNode.children.set(topLevelKey, nsNode);
            this.PopulateNodeRecursive(items, nsNode, topLevelKey);
        }
        Logger.LogMessage(`Store initialized. Root keys: ${Array.from(this.rootNode.children.keys()).join(", ")}`);
    }

    private static PopulateNodeRecursive(items: Record<string, IStaticJsonItem>, parentNode: NamespaceNode, currentPath: string): void
    {
        for (const [key, item] of Object.entries(items))
        {
            const fullPath = `${currentPath}.${key}`;
            const kind = this.resolveKind(item.kind ?? "");

            const decl = new Declaration(fullPath, kind, item.detail ?? fullPath, item.pythonType ?? "None", item.doc);

            if (item.children && Object.keys(item.children).length > 0)
            {
                const childNode = new NamespaceNode(key, decl);
                parentNode.children.set(key, childNode);
                this.PopulateNodeRecursive(item.children, childNode, fullPath);
            }
            else
            {
                parentNode.members.set(key, decl);
            }
        }
    }

    public static GetCompletionsForPath(dottedPath: string): vscode.CompletionItem[]
    {
        const segments = dottedPath.split(".").filter((s): boolean => s.length > 0);

        // Resolve type aliases if an intermediate instance exists (e.g. AliceFlags -> aliceFlags)
        const resolvedSegments = this.ResolvePathAliases(segments);
        const targetNode = this.rootNode.GetNodeAtPath(resolvedSegments);

        if (!targetNode)
        {
            return [];
        }

        return targetNode.GetImmediateCompletions();
    }

    public static RegisterUserSymbol(pathSegments: string[], decl: Declaration): void
    {
        let current = this.rootNode;

        for (let i = 0; i < pathSegments.length - 1; i++)
        {
            const seg = pathSegments[i];
            let child = current.children.get(seg);
            if (!child)
            {
                child = new NamespaceNode(seg);
                current.children.set(seg, child);
            }
            current = child;
        }

        const leafKey = pathSegments[pathSegments.length - 1];
        current.members.set(leafKey, decl);

        if (decl.pythonType && decl.pythonType !== "None")
        {
            this.typeAliasMap.set(pathSegments.join("."), decl.pythonType);
        }
    }

    public static RegisterTypeAlias(variablePath: string, classTypePath: string): void
    {
        this.typeAliasMap.set(variablePath, classTypePath);
    }

    private static ResolvePathAliases(segments: string[]): string[]
    {
        const resolved = [];
        let currentPath = "";

        for (const seg of segments)
        {
            currentPath = currentPath ? `${currentPath}.${seg}` : seg;
            // Do not resolve top level like preferences else we lose the namespace and only get the screen
            if (this.rootNode.children.has(currentPath))
            {
                resolved.push(seg);
                continue;
            }
            // Continue the check
            if (this.typeAliasMap.has(currentPath))
            {
                const aliasedType = this.typeAliasMap.get(currentPath)!;
                resolved.length = 0; // Reset to aliased type path
                resolved.push(...aliasedType.split("."));
                currentPath = aliasedType;
            }
            else
            {
                resolved.push(seg);
            }
        }

        return resolved;
    }

    public static RemoveDeclarationsFromFile(filePath: string): void
    {
        this.rootNode.ResetWorkspaceOverrides(filePath);
    }

    private static resolveKind(kind: string): vscode.CompletionItemKind
    {
        switch (kind.toLowerCase())
        {
            case "class": return vscode.CompletionItemKind.Class;
            case "method": return vscode.CompletionItemKind.Method;
            case "function": return vscode.CompletionItemKind.Function;
            case "module": return vscode.CompletionItemKind.Module;
            case "variable": return vscode.CompletionItemKind.Variable;
            default: return vscode.CompletionItemKind.Property;
        }
    }

    public static GetLabelCompletions(): vscode.CompletionItem[]
    {
        const items: vscode.CompletionItem[] = [];

        for (const [_, decl] of this.rootNode.members.entries())
        {
            if (decl.pythonType === "label" || decl.name.startsWith("label "))
            {
                const labelName = decl.name.replace(/^label\s+/, "");
                const item = new vscode.CompletionItem(labelName, decl.kind);
                item.detail = decl.detail;
                item.documentation = decl.documentation ? new vscode.MarkdownString(decl.documentation) : undefined;
                items.push(item);
            }
        }

        return items;
    }

    public static GetScreenCompletions(): vscode.CompletionItem[]
    {
        const items: vscode.CompletionItem[] = [];

        for (const [_, decl] of this.rootNode.members.entries())
        {
            if (decl.pythonType === "screen" || decl.name.startsWith("screen "))
            {
                const screenName = decl.name.replace(/^screen\s+/, "");
                const item = new vscode.CompletionItem(screenName, decl.kind);
                item.detail = decl.detail;
                item.documentation = decl.documentation ? new vscode.MarkdownString(decl.documentation) : undefined;
                items.push(item);
            }
        }

        return items;
    }

    public static GetImmediateCompletions(): vscode.CompletionItem[]
    {
        return this.rootNode.GetImmediateCompletions();
    }

    public static GetTransformCompletions(): vscode.CompletionItem[]
    {
        const items: vscode.CompletionItem[] = [];

        for (const [_, decl] of this.rootNode.members.entries())
        {
            if (decl.pythonType === "transform" || decl.name.startsWith("transform "))
            {
                const transformName = decl.name.replace(/^transform\s+/, "");
                const item = new vscode.CompletionItem(transformName, decl.kind);
                item.detail = decl.detail;
                item.documentation = decl.documentation ? new vscode.MarkdownString(decl.documentation) : undefined;
                items.push(item);
            }
        }

        return items;
    }
}
