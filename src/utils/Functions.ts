const intRegex: RegExp = /^-?\d+$/;
const floatRegex: RegExp = /^-?\d+\.\d+$/;
const stringRegex: RegExp = /^(?:"[\s\S]*?"|'[\s\S]*?')\s*(?:#.*)?$/;
const constructorRegex: RegExp = /^([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*\(/;

export function hasUnclosedDelimiters(text: string): boolean
{
    let parenthesis = 0;
    let brackets = 0;
    let braces = 0;
    let inString = null;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++)
    {
        const char = text[i];

        if (inString)
        {
            if (escapeNext)
            {
                escapeNext = false;

                continue;
            }
            if (char === "\\")
            {
                escapeNext = true;

                continue;
            }
            if (char === inString)
            {
                inString = null;
            }

            continue;
        }
        if (char === "\"" || char === "'")
        {
            inString = char;

            continue;
        }

        if (char === "(")  { parenthesis++; }
        else if (char === ")")  { parenthesis--; }
        else if (char === "[")  { brackets++; }
        else if (char === "]")  { brackets--; }
        else if (char === "{")  { braces++; }
        else if (char === "}")  { braces--; }
    }

    return parenthesis > 0 || brackets > 0 || braces > 0;
}

export function inferTypeFromExpression(rightHandExpr: string): string
{
    const expr = rightHandExpr.trim();

    const constructorMatch = expr.match(constructorRegex);
    if (constructorMatch)
    {
        return constructorMatch[1];
    }

    if (expr.startsWith("True") || expr.startsWith("False"))
    {
        return "bool";
    }
    if (expr.startsWith("None"))
    {
        return "None";
    }
    if (intRegex.test(expr))
    {
        return "int";
    }
    if (floatRegex.test(expr))
    {
        return "float";
    }
    if (stringRegex.test(expr) || expr.startsWith("str("))
    {
        return "str";
    }
    if ((expr.startsWith("{") && expr.endsWith("}") && expr.includes(":")) || expr === "{}" || expr.startsWith("dict("))
    {
        return "dict";
    }
    if ((expr.startsWith("[") && expr.endsWith("]")) || expr.startsWith("list("))
    {
        return "list";
    }
    if (expr.startsWith("set("))
    {
        return "set";
    }
    if ((expr.startsWith("(") && expr.endsWith(")")) || expr.startsWith("tuple("))
    {
        return "tuple";
    }

    return "Any";
}
