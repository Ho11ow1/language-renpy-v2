export class ParserScopeState
{
    public currentNamespace: string | null;
    public namespaceIndent: number;
    public currentClass: string | null;
    public classIndent: number;
    public currentFunction: string | null;
    public functionIndent: number;
    public currentLabel: string | null;
    public labelIndent: number;
    public currentMenuPath: string[] | null;
    public menuIndent: number;
    public menuOptionIndent: number;
    public inRenpyBlock: boolean;
    public blockIndent: number;

    public constructor(currentNamespace: string | null = null, namespaceIndent: number = -1, currentClass: string | null = null, classIndent: number = -1, currentFunction: string | null = null, functionIndent: number = -1, inRenpyBlock: boolean = false, blockIndent: number = -1, currentLabel: string | null = null, labelIndent: number = -1, currentMenuPath: string[] | null = null, menuIndent: number = -1, menuOptionIndent: number = -1)
    {
        this.currentNamespace = currentNamespace;
        this.namespaceIndent = namespaceIndent;
        this.currentClass = currentClass;
        this.classIndent = classIndent;
        this.currentFunction = currentFunction;
        this.functionIndent = functionIndent;
        this.currentLabel = currentLabel;
        this.labelIndent = labelIndent;
        this.currentMenuPath = currentMenuPath;
        this.menuIndent = menuIndent;
        this.menuOptionIndent = menuOptionIndent;
        this.inRenpyBlock = inRenpyBlock;
        this.blockIndent = blockIndent;
    }

    public update(lineIndent: number, lineLen: number): void
    {
        if (lineLen === 0)
        {
            return;
        }

        if (this.currentFunction !== null && lineIndent <= this.functionIndent)
        {
            this.currentFunction = null;
            this.functionIndent = -1;
        }
        if (this.currentClass !== null && lineIndent <= this.classIndent)
        {
            this.currentClass = null;
            this.classIndent = -1;
        }
        if (this.currentLabel !== null && lineIndent <= this.labelIndent)
        {
            this.currentLabel = null;
            this.labelIndent = -1;
        }
        if (this.currentMenuPath !== null && lineIndent <= this.menuIndent)
        {
            this.currentMenuPath = null;
            this.menuIndent = -1;
            this.menuOptionIndent = -1;
        }
        if (this.inRenpyBlock && lineIndent <= this.blockIndent)
        {
            this.inRenpyBlock = false;
            this.blockIndent = -1;
        }
        if (this.currentNamespace !== null && lineIndent <= this.namespaceIndent)
        {
            this.currentNamespace = null;
            this.namespaceIndent = -1;
        }
    }
}
