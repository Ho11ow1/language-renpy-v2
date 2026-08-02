export class ParserUtils
{
    private static propertyDecoratorRegex: RegExp = new RegExp("^\\s*@(?:property|[a-zA-Z_]\\w*\\.setter)\\b");
    private static setterDecoratorRegex: RegExp = new RegExp("^\\s*@[a-zA-Z_]\\w*\\.setter\\b");
    private static variantDecoratorRegex: RegExp = new RegExp("^\\s*@[a-zA-Z_]\\w*\\.variant\\b");

    private static tabRegex: RegExp = new RegExp("\\t", "g");
    private static whitespaceRegex: RegExp = new RegExp("^(\\s*)");
    private static docStringStartRegex: RegExp = new RegExp("^(\"\"\")");


    public static getIndentLevel(line: string): number
    {
        const match = line.match(this.whitespaceRegex);
        if (!match)
        {
            return 0;
        }

        return match[1].replace(this.tabRegex, "    ").length;
    }

    public static getScopePath(currentNamespace: string | null, currentClass: string | null, ...subPaths: string[]): string[]
    {
        const parts = [];

        if (currentNamespace)
        {
            parts.push(currentNamespace);
        }
        if (currentClass)
        {
            parts.push(currentClass);
        }

        return [...parts, ...subPaths];
    };

    public static getQualifiedType(currentNamespace: string | null, typeStr: string): string
    {
        if (currentNamespace && !typeStr.includes(".") && typeStr !== "Any" && typeStr !== "None")
        {
            return `${currentNamespace}.${typeStr}`;
        }

        return typeStr;
    };

    public static getMethodDecorators(lines: string[], lineIndex: number): [boolean, boolean, boolean]
    {
        let isProperty = false;
        let isSetter = false;
        let isVariant = false;
        let checkIndex = lineIndex - 1;

        while (checkIndex >= 0)
        {
            const prev = lines[checkIndex].trim();
            if (prev.length === 0 || prev.startsWith("#"))
            {
                checkIndex--;
                continue;
            }

            if (prev.startsWith("@"))
            {
                if (this.propertyDecoratorRegex.test(prev))
                {
                    isProperty = true;
                    if (this.setterDecoratorRegex.test(prev))
                    {
                        isSetter = true;
                    }
                }
                if (this.variantDecoratorRegex.test(prev))
                {
                    isVariant = true
                }

                checkIndex -= 1;

                continue;
            }

            break;
        }
        
        return [isSetter, isVariant, isProperty];
    }

    public static getMethodDoc(lines: string[], lineIndex: number): string
    {
        let docString = "";
        let searchIndex = lineIndex + 1;
        while (searchIndex < lines.length && lines[searchIndex].trim().length === 0)
        {
            searchIndex++;
        }

        if (searchIndex < lines.length)
        {
            const first = lines[searchIndex].trim();
            
            const quoteMatch = first.match(this.docStringStartRegex);
            if (quoteMatch)
            {
                const quoteSymbol = quoteMatch[1];
                const firstContent = first.slice(quoteSymbol.length);

                if (firstContent.endsWith(quoteSymbol) && firstContent.length >= quoteSymbol.length)
                {
                    docString = firstContent.slice(0, -quoteSymbol.length).trim();
                }
                else
                {
                    const docLines = [];
                    if (firstContent.length > 0)
                    {
                        docLines.push(firstContent);
                    }

                    searchIndex += 1;
                    while (searchIndex < lines.length)
                    {
                        const currentLine = lines[searchIndex].trim();

                        if (currentLine.endsWith(quoteSymbol))
                        {
                            const content = currentLine.slice(0, -quoteSymbol.length).trim();
                            if (content.length > 0)
                            {
                                docLines.push(content);
                            }

                            break;
                        }

                        docLines.push(currentLine);

                        searchIndex += 1;
                    }

                    docString = docLines.join("\n").trim();
                }
            }
        }

        return docString;
    }
}
