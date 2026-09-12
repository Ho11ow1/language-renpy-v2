import * as Models from "@server/models/index";

export class Store
{
    private static labelNodes: Models.Node[] = [];
    private static screenNodes: Models.Node[] = [];
    private static imageNodes: Models.Node[] = [];

    private static nodesByDocument: Map<string, Models.Node[]> = new Map<string, Models.Node[]>();

    public static setDocumentNodes(uri: string, nodes: Models.Node[]): void
    {
        this.clearDocumentNodes(uri);
        this.nodesByDocument.set(uri, nodes);

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

    public static clearDocumentNodes(uri: string): void
    {
        const existingNodes = this.nodesByDocument.get(uri);
        if (!existingNodes)
        {
            return;
        }

        const documentNodesSet = new Set(existingNodes);
        this.labelNodes = this.labelNodes.filter((label): boolean => !documentNodesSet.has(label));
        this.screenNodes = this.screenNodes.filter((screen): boolean => !documentNodesSet.has(screen));
        this.imageNodes = this.imageNodes.filter((image): boolean => !documentNodesSet.has(image));

        this.nodesByDocument.delete(uri);
    }

    public static clear(): void
    {
        this.labelNodes = [];
        this.screenNodes = [];
        this.imageNodes = [];
        this.nodesByDocument.clear();
    }
}
