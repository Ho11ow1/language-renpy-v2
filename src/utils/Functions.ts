const intRegex: RegExp = new RegExp("^-?\\d+$");
const floatRegex: RegExp = new RegExp("^-?\\d+\\.\\d+$");
const stringRegex: RegExp = new RegExp("^(?:\"[\\s\\S]*\"|'[\\s\\S]*')$");
const constructorRegex: RegExp = new RegExp("^([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)\\s*\\(");

export function HasUnclosedDelimiters(text: string): boolean
{
    let parenthesis = 0;
    let brackets = 0;
    let braces = 0;
    let inString = null;

    for (let i = 0; i < text.length; i++)
    {
        const char = text[i];

        if (inString)
        {
            if (char === inString && text[i - 1] !== "\\")
            {
                inString = null;
            }
            continue;
        }

        if (char === '"' || char === "'")
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

export function InferTypeFromExpression(rightHandExpr: string): string
{
    const expr: string = rightHandExpr.trim();

    const constructorMatch = expr.match(constructorRegex);
    if (constructorMatch)
    {
        return constructorMatch[1];
    }

    if (expr === "True" || expr === "False")
    {
        return "bool";
    }

    if (expr === "None")
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

    if (stringRegex.test(expr))
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
