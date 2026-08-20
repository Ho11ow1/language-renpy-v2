import * as vscode from "vscode";

export class ParserUtils
{
    private static readonly _propertyDecoratorRegex: RegExp = /^\s*@(?:property|[a-zA-Z_]\w*\.setter)\b/;
    private static readonly _setterDecoratorRegex: RegExp = /^\s*@[a-zA-Z_]\w*\.setter\b/;
    private static readonly _variantDecoratorRegex: RegExp = /^\s*@[a-zA-Z_]\w*\.variant\b/;
    private static readonly _constructorRegex: RegExp = /^\s*def\s+__init__\s*\(([^)]*)\)/;
    private static readonly _docStringStartRegexa: RegExp = /^("""|''')/;

    public static getIndentLevel(line: string, tabSize: number): number
    {
        let indentation = 0;

        for (const character of line)
        {
            if (character === " ")
            {
                indentation++;
            }
            else if (character === "\t")
            {
                indentation += tabSize;
            }
            else
            {
                break;
            }
        }

        return indentation;
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

    public static getMethodDecorators(document: vscode.TextDocument, lineIndex: number): [boolean, boolean, boolean]
    {
        let isProperty = false;
        let isSetter = false;
        let isVariant = false;
        let checkIndex = lineIndex - 1;

        while (checkIndex >= 0)
        {
            const prev = document.lineAt(checkIndex).text.trim();
            if (prev.length === 0 || prev.startsWith("#"))
            {
                checkIndex--;
                continue;
            }

            if (prev.startsWith("@"))
            {
                if (this._propertyDecoratorRegex.test(prev))
                {
                    isProperty = true;
                    if (this._setterDecoratorRegex.test(prev))
                    {
                        isSetter = true;
                    }
                }
                if (this._variantDecoratorRegex.test(prev))
                {
                    isVariant = true;
                }

                checkIndex -= 1;

                continue;
            }

            break;
        }

        return [isSetter, isVariant, isProperty];
    }

    public static getMethodDoc(document: vscode.TextDocument, lineIndex: number): [string, number]
    {
        let searchIndex = lineIndex + 1;

        while (searchIndex < document.lineCount && document.lineAt(searchIndex).text.trim().length === 0)
        {
            searchIndex++;
        }

        if (searchIndex >= document.lineCount)
        {
            return ["", lineIndex];
        }

        const first = document.lineAt(searchIndex).text.trim();
        const quoteMatch = first.match(this._docStringStartRegexa);
        if (!quoteMatch)
        {
            return ["", searchIndex];
        }

        const quoteSymbol = quoteMatch[1];
        const firstContent = first.slice(quoteSymbol.length);

        if (firstContent.endsWith(quoteSymbol) && firstContent.length >= quoteSymbol.length)
        {
            return [firstContent.slice(0, -quoteSymbol.length).trim(), searchIndex];
        }

        const docLines: string[] = [];

        if (firstContent.length > 0)
        {
            docLines.push(firstContent);
        }

        searchIndex++;
        while (searchIndex < document.lineCount)
        {
            const currentLine = document.lineAt(searchIndex).text.trim();

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
            searchIndex++;
        }

        return [docLines.join("\n").trim(), searchIndex];
    }

    public static getClassConstructor(document: vscode.TextDocument, lineIndex: number, lineIndent: number, className: string, tabSize: number): string | undefined
    {
        for (let i = lineIndex + 1; i < document.lineCount; i++)
        {
            const currentLine = document.lineAt(i).text;
            if (!currentLine.trim())
            {
                continue;
            }

            const currentIndent = this.getIndentLevel(currentLine, tabSize);
            if (currentIndent <= lineIndent)
            {
                break;
            }

            const initMatch = currentLine.match(this._constructorRegex);
            if (initMatch)
            {
                return `${className}(${initMatch[1]})`;
            }
        }

        return undefined;
    }
}
