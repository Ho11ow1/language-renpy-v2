import * as Models from "@server/models/index";
import * as lsps from "vscode-languageserver/node";

export class Store
{
    private static labelNodes: Models.Node[] = [];
    private static screenNodes: Models.Node[] = [];
    private static imageNodes: Models.Node[] = [];
    private static transformNodes: Models.Node[] = [];

    private static nodesByDocument: Map<string, Models.Node[]> = new Map<string, Models.Node[]>();

    public static setDocumentNodes(uri: string, newNodes: Models.Node[]): void
    {
        this.clearReferencesFromDocument(uri);
        this.nodesByDocument.set(uri, newNodes);
        this.rebuildIndexes();
    }

    public static renameDocument(oldUri: string, newUri: string): void
    {
        const nodes = this.nodesByDocument.get(oldUri);
        if (!nodes)
        {
            return;
        }

        this.nodesByDocument.delete(oldUri);
        this.nodesByDocument.set(newUri, nodes);

        for (const node of nodes)
        {
            if (node.Location?.uri === oldUri)
            {
                node.Location = { ...node.Location, uri: newUri };
            }
        }

        for (const node of [...this.labelNodes, ...this.screenNodes, ...this.imageNodes])
        {
            node.References = node.References.map((ref): lsps.Location =>
                ref.uri === oldUri ? { ...ref, uri: newUri } : ref
            );
        }
    }

    public static getNodesForDocument(uri: string): Models.Node[]
    {
        return this.nodesByDocument.get(uri) || [];
    }
    public static getLabels(): Models.Node[]
    {
        return this.labelNodes;
    }
    public static getScreens(): Models.Node[]
    {
        return this.screenNodes;
    }
    public static getImages(): Models.Node[]
    {
        return this.imageNodes;
    }
    public static getTransforms(): Models.Node[]
    {
        return this.transformNodes;
    }
    public static getLabel(name: string): Models.Node | undefined
    {
        return this.labelNodes.find((node): boolean => node.Name === name);
    }
    public static getScreen(name: string): Models.Node | undefined
    {
        return this.screenNodes.find((node): boolean => node.Name === name);
    }
    public static getImage(name: string): Models.Node | undefined
    {
        return this.imageNodes.find((node): boolean => node.Name === name);
    }
    public static getTransform(name: string): Models.Node | undefined
    {
        return this.transformNodes.find((node): boolean => node.Name === name);
    }

    public static clearDocumentNodes(uri: string): void
    {
        if (!this.nodesByDocument.has(uri))
        {
            return;
        }

        this.nodesByDocument.delete(uri);
        this.clearReferencesFromDocument(uri);
        this.rebuildIndexes();
    }

    private static clearReferencesFromDocument(uri: string): void
    {
        for (const node of [...this.labelNodes, ...this.screenNodes, ...this.imageNodes, ...this.transformNodes])
        {
            node.References = node.References.filter((ref): boolean => ref.uri !== uri);
        }
    }

    private static rebuildIndexes(): void
    {
        this.labelNodes = [];
        this.screenNodes = [];
        this.imageNodes = [];
        this.transformNodes = [];

        for (const nodes of this.nodesByDocument.values())
        {
            for (const node of nodes)
            {
                if (node instanceof Models.LabelNode)
                {
                    this.labelNodes.push(node);
                }
                else if (node instanceof Models.MenuNode && node.IsNamed)
                {
                    this.labelNodes.push(node);
                }
                else if (node instanceof Models.ScreenNode)
                {
                    this.screenNodes.push(node);
                }
                else if (node instanceof Models.ImageNode)
                {
                    this.imageNodes.push(node);
                }
                else if (node instanceof Models.TransformNode)
                {
                    this.transformNodes.push(node);
                }
            }
        }
    }
}
