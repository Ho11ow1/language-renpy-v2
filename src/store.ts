import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";
import { NamespaceNode } from "@models/NamespaceNode";
import { IStaticJsonItem } from "@interfaces/IStaticJsonItem";
import { Logger } from "@utils/Logger";
import { pythonTypeMethods, pythonRootFunctions } from "@data/python";
import renpyJson from "@data/renpy.json";


export class Store
{
    private static rootNode: NamespaceNode = new NamespaceNode("root");
    private static typeAliasMap: Map<string, string> = new Map<string, string>();

    public static get getImmediateCompletions(): vscode.CompletionItem[] { return this.rootNode.getImmediateCompletions(); }
    public static get getLabelCompletions(): vscode.CompletionItem[] { return this.getKeywordCompletions("label"); }
    public static get getScreenCompletions(): vscode.CompletionItem[] { return this.getKeywordCompletions("screen"); }
    public static get getTransformCompletions(): vscode.CompletionItem[] { return this.getKeywordCompletions("transform"); }
    public static get getStyleCompletions(): vscode.CompletionItem[] { return this.getKeywordCompletions("style"); }
    public static get getImageCompletions(): vscode.CompletionItem[] { return this.getKeywordCompletions("image"); }
    public static getCompletionsForPath(dottedPath: string): vscode.CompletionItem[]
    {
        const segments = dottedPath.split(".").filter((s): boolean => s.length > 0);

        const resolvedSegments = this.resolvePathAliases(segments);
        const targetNode = this.rootNode.getNodeAtPath(resolvedSegments);
        if (!targetNode)
        {
            if (resolvedSegments.length === 1 && pythonTypeMethods.has(resolvedSegments[0]))
            {
                return pythonTypeMethods.get(resolvedSegments[0])!.map((decl): vscode.CompletionItem => decl.AsCompletionItem());
            }

            return [];
        }

        return targetNode.getImmediateCompletions();
    }

    public static init(): void
    {
        this.typeAliasMap.clear();

        const data = renpyJson as Record<string, Record<string, IStaticJsonItem>>;
        for (const [topLevelKey, items] of Object.entries(data))
        {
            const nsNode = new NamespaceNode(topLevelKey);

            this.rootNode.children.set(topLevelKey, nsNode);
            this.populateNodeRecursive(items, nsNode, topLevelKey);
        }
        for (const decl of pythonRootFunctions)
        {
            this.rootNode.members.set(decl.name, decl);
        }

        Logger.logMessage(`Store initialized. Root keys: ${Array.from(this.rootNode.children.keys()).join(", ")}`);
    }

    public static removeDeclarationsFromFile(filePath: string): void
    {
        this.rootNode.resetWorkspaceOverrides(filePath);
    }

    public static registerTypeAlias(variablePath: string, classTypePath: string): void
    {
        this.typeAliasMap.set(variablePath, classTypePath);
    }

    public static registerUserSymbol(pathSegments: string[], declaration: Declaration): void
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
            const existingDecl = currentNode.members.get(lastSegment);
            if (existingDecl && !existingDecl.isCustom && existingDecl.kind === declaration.kind)
            {
                existingDecl.detail = declaration.detail;
                existingDecl.documentation = declaration.documentation;
                existingDecl.locationInfo = declaration.locationInfo;
                existingDecl.pythonType = declaration.pythonType;
            }
            else
            {
                currentNode.members.set(lastSegment, declaration);
            }
        }
    }

    public static ensurePathExists(pathSegments: string[]): NamespaceNode
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

    public static getDeclarationAtPath(pathSegments: string[]): Declaration | undefined
    {
        if (pathSegments.length === 0)
        {
            return undefined;
        }

        const parentSegments = pathSegments.slice(0, -1);
        const leafName = pathSegments[pathSegments.length - 1];

        const resolvedParents = parentSegments.length > 0 ? this.resolvePathAliases(parentSegments) : [];
        const parentNode = resolvedParents.length > 0 ? this.rootNode.getNodeAtPath(resolvedParents) : this.rootNode;
        if (!parentNode)
        {
            if (resolvedParents.length === 1 && pythonTypeMethods.has(resolvedParents[0]))
            {
                return pythonTypeMethods.get(resolvedParents[0])!.find((d): boolean => d.name === leafName);
            }

            return undefined;
        }

        if (parentNode.members.has(leafName))
        {
            return parentNode.members.get(leafName);
        }
        if (parentNode.children.has(leafName))
        {
            return parentNode.children.get(leafName)?.declaration;
        }

        return undefined;
    }

    private static resolveKind(kind: string): vscode.CompletionItemKind
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

    private static populateNodeRecursive(items: Record<string, IStaticJsonItem>, parentNode: NamespaceNode, currentPath: string): void
    {
        for (const [key, item] of Object.entries(items))
        {
            const fullPath = `${currentPath}.${key}`;
            const kind = this.resolveKind(item.kind ?? "");

            const decl = new Declaration(fullPath, kind, item.detail ?? "", item.pythonType ?? "Any", item.doc ?? "", undefined, false);

            if (item.children && Object.keys(item.children).length > 0)
            {
                const childNode = new NamespaceNode(key, decl);

                parentNode.children.set(key, childNode);
                this.populateNodeRecursive(item.children, childNode, fullPath);
            }
            else
            {
                parentNode.members.set(key, decl);
            }
        }
    }

    private static resolvePathAliases(segments: string[]): string[]
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
                currentNode = this.rootNode.getNodeAtPath(resolved);

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
                    if (!this.rootNode.getNodeAtPath(typeSegments) && resolved.length > 0)
                    {
                        const parentNamespace = resolved[0];

                        const qualifiedType = `${parentNamespace}.${targetType}`;
                        if (this.rootNode.getNodeAtPath(qualifiedType.split(".")))
                        {
                            typeSegments = qualifiedType.split(".");
                        }
                    }

                    resolved.length = 0;

                    resolved.push(...typeSegments);
                    currentPath = typeSegments.join(".");
                    currentNode = this.rootNode.getNodeAtPath(resolved);

                    continue;
                }
            }

            resolved.push(seg);
        }

        return resolved;
    }

    private static getKeywordCompletions(wantedType: string): vscode.CompletionItem[]
    {
        const items = [];
        const prefixRegex = new RegExp(`^${wantedType}\\s+`);

        // const targetNode = this.rootNode.children.get(wantedType);
        // if (targetNode)
        // {
        //     for (const [_, decl] of targetNode.members.entries())
        //     {
        //         items.push(decl.AsCompletionItem(prefixRegex));
        //     }
        // }

        for (const [_, decl] of this.rootNode.members.entries())
        {
            if (decl.name.startsWith(wantedType) || decl.pythonType == wantedType)
            {
                items.push(decl.AsCompletionItem(prefixRegex));
            }
        }

        return items;
    }
}
