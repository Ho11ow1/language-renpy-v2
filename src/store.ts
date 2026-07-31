import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";
import { NamespaceNode } from "@models/NamespaceNode";
import { IStaticJsonItem } from "@interfaces/IStaticJsonItem";
import { Logger } from "@utils/Logger";
import renpyJson from "@data/renpy.json";


export class Store
{
    private static rootNode: NamespaceNode = new NamespaceNode("root");
    private static typeAliasMap: Map<string, string> = new Map<string, string>();

    public static get GetImmediateCompletions(): vscode.CompletionItem[] { return this.rootNode.GetImmediateCompletions(); }
    public static get GetLabelCompletions(): vscode.CompletionItem[] { return this.GetCompletions("label"); }
    public static get GetScreenCompletions(): vscode.CompletionItem[] { return this.GetCompletions("screen"); }
    public static get GetTransformCompletions(): vscode.CompletionItem[] { return this.GetCompletions("transform"); }
    public static get GetStyleCompletions(): vscode.CompletionItem[] { return this.GetCompletions("style"); }
    public static get GetImageCompletions(): vscode.CompletionItem[] { return this.GetCompletions("image"); }

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

    public static RemoveDeclarationsFromFile(filePath: string): void
    {
        this.rootNode.ResetWorkspaceOverrides(filePath);
    }

    public static RegisterTypeAlias(variablePath: string, classTypePath: string): void
    {
        this.typeAliasMap.set(variablePath, classTypePath);
    }

    public static GetCompletionsForPath(dottedPath: string): vscode.CompletionItem[]
    {
        const segments = dottedPath.split(".").filter((s): boolean => s.length > 0);

        const resolvedSegments = this.ResolvePathAliases(segments);
        const targetNode = this.rootNode.GetNodeAtPath(resolvedSegments);

        if (!targetNode)
        {
            return [];
        }

        return targetNode.GetImmediateCompletions();
    }

    public static RegisterUserSymbol(pathSegments: string[], declaration: Declaration): void
    {
        if (pathSegments.length === 0)
        {
            return;
        }

        let currentNode = this.rootNode;
        for (let i = 0; i < pathSegments.length - 1; i++)
        {
            const segment = pathSegments[i];
            let childNode = currentNode.children.get(segment);
            if (!childNode)
            {
                childNode = new NamespaceNode(segment);
                currentNode.children.set(segment, childNode);
            }

            currentNode = childNode;
        }

        const lastSegment = pathSegments[pathSegments.length - 1];

        if (declaration.kind === vscode.CompletionItemKind.Class)
        {
            let classNode = currentNode.children.get(lastSegment);
            if (!classNode)
            {
                classNode = new NamespaceNode(lastSegment, declaration);
                currentNode.children.set(lastSegment, classNode);
            }
            else
            {
                classNode.declaration = declaration;
            }
        }
        else
        {
            currentNode.members.set(lastSegment, declaration);
        }
    }

    public static EnsurePathExists(pathSegments: string[]): NamespaceNode
    {
        let currentNode = this.rootNode;

        for (const segment of pathSegments)
        {
            let childNode = currentNode.children.get(segment);
            if (!childNode)
            {
                childNode = new NamespaceNode(segment);
                currentNode.children.set(segment, childNode);
            }
            currentNode = childNode;
        }

        return currentNode;
    }

    private static ResolveKind(kind: string): vscode.CompletionItemKind
    {
        switch (kind.toLowerCase())
        {
            case "class":
                return vscode.CompletionItemKind.Class;
            case "method":
                return vscode.CompletionItemKind.Method;
            case "function":
                return vscode.CompletionItemKind.Function;
            case "module":
                return vscode.CompletionItemKind.Module;
            case "variable":
                return vscode.CompletionItemKind.Variable;
            default:
                return vscode.CompletionItemKind.Property;
        }
    }

    private static PopulateNodeRecursive(items: Record<string, IStaticJsonItem>, parentNode: NamespaceNode, currentPath: string): void
    {
        for (const [key, item] of Object.entries(items))
        {
            const fullPath = `${currentPath}.${key}`;
            const kind = this.ResolveKind(item.kind ?? "");

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

    private static ResolvePathAliases(segments: string[]): string[]
    {
        const resolved = [];
        let currentPath = "";
        let currentNode: NamespaceNode | undefined = this.rootNode;

        for (const seg of segments)
        {
            currentPath = currentPath ? `${currentPath}.${seg}` : seg;
            if (this.typeAliasMap.has(currentPath))
            {
                const aliasedType = this.typeAliasMap.get(currentPath)!;
                resolved.length = 0;
                resolved.push(...aliasedType.split("."));
                currentPath = aliasedType;
                currentNode = this.rootNode.GetNodeAtPath(resolved);
                continue;
            }
            if (currentNode && currentNode.children.has(seg))
            {
                resolved.push(seg);
                currentNode = currentNode.children.get(seg);
                continue;
            }
            if (currentNode && currentNode.members.has(seg))
            {
                const member = currentNode.members.get(seg)!;
                let targetType = member.pythonType;

                if (targetType && targetType !== "Any" && targetType !== "None")
                {
                    let typeSegments = targetType.split(".");

                    if (!this.rootNode.GetNodeAtPath(typeSegments) && resolved.length > 0)
                    {
                        const parentNamespace = resolved[0];
                        const qualifiedType = `${parentNamespace}.${targetType}`;
                        if (this.rootNode.GetNodeAtPath(qualifiedType.split(".")))
                        {
                            typeSegments = qualifiedType.split(".");
                        }
                    }

                    resolved.length = 0;
                    resolved.push(...typeSegments);
                    currentPath = typeSegments.join(".");
                    currentNode = this.rootNode.GetNodeAtPath(resolved);
                    continue;
                }
            }

            resolved.push(seg);
        }

        return resolved;
    }

    private static GetCompletions(wantedType: string): vscode.CompletionItem[]
    {
        const items = [];
        const prefixRegex = new RegExp(`^${wantedType}\\s+`);

        for (const [_, delc] of this.rootNode.members.entries())
        {
            if (delc.pythonType === wantedType || delc.name.startsWith(`${wantedType} `))
            {
                const name = delc.name.replace(prefixRegex, "");
                const item = new vscode.CompletionItem(name, delc.kind);

                item.detail = delc.detail;
                item.documentation = delc.documentation ? new vscode.MarkdownString(delc.documentation) : undefined;
                if (item.kind === vscode.CompletionItemKind.Function || item.kind === vscode.CompletionItemKind.Method)
                {
                    item.insertText = new vscode.SnippetString(`${name}($1)`);
                    item.command = {
                        command: "editor.action.triggerParameterHints",
                        title: "Trigger Parameter Hints"
                    };
                }

                items.push(item);
            }
        }

        return items;
    }
}
