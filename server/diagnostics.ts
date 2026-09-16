import * as lsps from "vscode-languageserver";

export class Diagnostics
{
    private static connection: lsps.Connection;

    public static init(connection: lsps.Connection): void
    {
        this.connection = connection;
    }
}

function isPascalCase(value: string): boolean
{
    if (!isUppercase(value[0]))
    {
        return false;
    }

    for (let i = 1; i < value.length; i++)
    {
        const c = value[i];

        if (!isLetterOrDigit(c))
        {
            return false;
        }
    }

    return true;
}

function isSnakeCase(value: string): boolean
{
    if (value[0] === "_" || value[value.length - 1] === "_")
    {
        return false;
    }

    let previousWasUnderscore = false;

    for (const character of value)
    {
        if (character === "_")
        {
            if (previousWasUnderscore)
            {
                return false;
            }

            previousWasUnderscore = true;

            continue;
        }

        if (!isLowercase(character) && !isDigit(character))
        {
            return false;
        }

        previousWasUnderscore = false;
    }

    return true;
}

function isScreamingSnakeCase(value: string): boolean
{
    if (value[0] === "_" || value[value.length - 1] === "_")
    {
        return false;
    }

    let previousWasUnderscore = false;

    for (const character of value)
    {
        if (character === "_")
        {
            if (previousWasUnderscore)
            {
                return false;
            }

            previousWasUnderscore = true;

            continue;
        }

        if (!isUppercase(character) && !isDigit(character))
        {
            return false;
        }

        previousWasUnderscore = false;
    }

    return true;
}

function isUppercase(c: string): boolean
{
    return c >= "A" && c <= "Z";
}

function isLowercase(c: string): boolean
{
    return c >= "a" && c <= "z";
}

function isDigit(c: string): boolean
{
    return c >= "0" && c <= "9";
}

function isLetterOrDigit(character: string): boolean
{
    return isUppercase(character) || isLowercase(character) || isDigit(character);
}
