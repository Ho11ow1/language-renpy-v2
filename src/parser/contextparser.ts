import * as Interfaces from "@interfaces/index";
import * as Src from "@src/index";

export class ContextParser
{
    private static readonly _addUsageRegex: RegExp = /\badd\s+([a-zA-Z_]\w*)/;
    private static readonly _useUsageRegex: RegExp = /\buse\s+([a-zA-Z_]\w*)/;

    private static readonly _imageDeclRegex: RegExp = /^\s*image\s+([a-zA-Z0-9_\s]+?)\s*[=:]\s*([\s\S]*)$/;
    private static readonly _imageUsageRegex: RegExp = /\b(?:show|scene|hide)\s+(.+?)(?:\s+at\s+.+|:)?$/;
    private static readonly _screenDeclRegex: RegExp = /^\s*screen\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _screenUsageRegex: RegExp = /\b(?:show|call|hide)\s+(?:screen)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;

    private static readonly _labelDeclRegex: RegExp = /^\s*label\s+(?!_\s*\()([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _labelUsageRegex: RegExp = /\b(?:jump|call)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;

    private static readonly _transformDeclRegex: RegExp = /^\s*transform\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _transformUsageRegex: RegExp = /\b(?:show|scene|hide)\s+\w+(?:\s+\w+)?\s+(?:at)\s+([a-zA-Z0-9_]+)/;

    private static readonly _transitionUsageRegex: RegExp = /\b(?:(?:show|scene|hide)\s+\w+(?:\s+\w+)?(?:\s+at\s+\w+)?|show\s+screen\s+\w+)\s+with\s+([a-zA-Z0-9_]+)/;

    private static readonly _styleDeclRegex: RegExp = /^\s*style\s+([a-zA-Z_]\w*)(?:\s+is\b[^:]*)?\s*:?\s*$/;

    public static tryGetDeclaration(line: string, offset?: number): Interfaces.IContextMatch[] | undefined
    {
        let name = "";
        let start = -1;
        let end = -1;
        let match: RegExpMatchArray | null = null;

        if ((match = line.match(this._labelDeclRegex) ?? line.match(this._labelUsageRegex)) !== null)
        {
            name = match[1].trim();
            start = match.index! + match[0].indexOf(name);
            end = start + name.length;
            if (this.isInBounds(start, end, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["label", name]);
                if (decl)
                {
                    return [{ declaration: decl, start, end }];
                }
            }
        }
        if ((match = line.match(this._transformDeclRegex) ?? line.match(this._transformUsageRegex)) !== null)
        {
            name = match[1].trim();
            start = match.index! + match[0].indexOf(name);
            end = start + name.length;
            if (this.isInBounds(start, end, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["transform", name]);
                if (decl)
                {
                    return [{ declaration: decl, start, end }];
                }
            }
        }
        if ((match = line.match(this._transitionUsageRegex)) !== null)
        {
            name = match[1].trim();
            start = match.index! + match[0].indexOf(name);
            end = start + name.length;
            if (this.isInBounds(start, end, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["transition", name]);
                if (decl)
                {
                    return [{ declaration: decl, start, end }];
                }
            }
        }
        if ((match = line.match(this._styleDeclRegex)) !== null)
        {
            name = match[1].trim();
            start = match.index! + match[0].indexOf(name);
            end = start + name.length;
            if (this.isInBounds(start, end, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["style", name]);
                if (decl)
                {
                    return [{ declaration: decl, start, end }];
                }
            }
        }

        let name1 = "";
        let start1 = -1;
        let end1 = -1;
        const found = [];

        if ((match = line.match(this._imageDeclRegex) ?? line.match(this._imageUsageRegex) ?? line.match(this._addUsageRegex)) !== null)
        {
            name = match[1].trim();
            start = match.index! + match[0].indexOf(name);
            end = start + name.length;
            if (this.isInBounds(start, end, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["image", name]);
                if (decl)
                {
                    found.push({ declaration: decl, start, end });
                }
            }
        }
        if ((match = line.match(this._screenDeclRegex) ?? line.match(this._screenUsageRegex) ?? line.match(this._addUsageRegex) ?? line.match(this._useUsageRegex)) !== null)
        {
            name1 = match[1].trim();
            start1 = match.index! + match[0].indexOf(name1);
            end1 = start1 + name1.length;
            if (this.isInBounds(start1, end1, offset))
            {
                const decl = Src.Store.getDeclarationAtPath(["screen", name1]);
                if (decl)
                {
                    found.push({ declaration: decl, start: start1, end: end1 });
                }
            }
        }

        return found.length > 0 ? found : undefined;
    }

    private static isInBounds(start: number, end: number, offset?: number): boolean
    {
        return offset === undefined || (offset >= start && offset <= end);
    }
}
