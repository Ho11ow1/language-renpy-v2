import * as lsps from "vscode-languageserver";
import * as Common from "@common/index";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";

export class Formatter
{
    private static trimTrailingWhitespace: boolean = true;
    private static addEmptyNewLine: boolean = true;
    private static preferredStringQuote: string = '"';
    private static preferredAssignmentSpacing: number = 1;
    private static preferredExpressionSpacing: number = 1;

    private static readonly _fileSplitRegex: RegExp = /\r?\n/;
    private static readonly _trailingWhitespaceRegex: RegExp = /\s+$/;

    public static updateConfig(config: Common.IFormatterConfig): void
    {
        this.trimTrailingWhitespace = config.TrimTrailingWhitespace;
        this.addEmptyNewLine = config.AddEmptyNewLine;
        this.preferredStringQuote = config.PreferredStringQuotes;
        this.preferredAssignmentSpacing = config.PreferredAssignmentSpace;
        this.preferredExpressionSpacing = config.PreferredExpressionSpace;
    }

    public static formatDocument(tokens: Models.Token[], text: string): lsps.TextEdit[]
    {
        return [
            ...this.formatFloats(tokens),
            ...this.formatStrings(tokens),
            ...this.formatOperators(tokens),
            ...this.formatPunctuation(tokens),
            ...this.formatLastLine(text, tokens),
            ...this.formatTrailingWhitespace(text)
        ];
    }

    private static formatLastLine(text: string, tokens: Models.Token[]): lsps.TextEdit[]
    {
        if (!this.addEmptyNewLine)
        {
            return [];
        }

        if (text.length > 0 && !text.endsWith('\n'))
        {
            const endPos = tokens[tokens.length - 1].Range.end;

            return [{
                range: { start: endPos, end: endPos },
                newText: "\n"
            }];
        }

        return [];
    }

    private static formatTrailingWhitespace(text: string): lsps.TextEdit[]
    {
        if (!this.trimTrailingWhitespace)
        {
            return [];
        }

        const edits: lsps.TextEdit[] = [];
        const lines = text.split(this._fileSplitRegex);

        for (let i = 0; i < lines.length; i++)
        {
            const line = lines[i];
            const match = line.match(this._trailingWhitespaceRegex);

            if (match && match.index !== undefined)
            {
                edits.push({
                    range: {
                        start: { line: i, character: match.index },
                        end: { line: i, character: line.length }
                    },
                    newText: ""
                });
            }
        }

        return edits;
    }

    private static formatStrings(tokens: Models.Token[]): lsps.TextEdit[]
    {
        if (this.preferredStringQuote === "MIXED")
        {
            return [];
        }

        const edits: lsps.TextEdit[] = [];

        for (let i = 0; i < tokens.length; i++)
        {
            const token = tokens[i];
            if (token.Type !== Models.TokenType.STRING)
            {
                continue;
            }

            const currentQuote = token.Value[0];
            if (currentQuote === this.preferredStringQuote || token.Value.length < 2)
            {
                continue;
            }

            const prev = tokens[i - 1];
            const isInterpolationString = (prev && prev.Type === Models.TokenType.IDENTIFIER && prev.Value.toLowerCase() === "f" && prev.Range.end.character === token.Range.start.character && prev.Range.end.line === token.Range.start.line);
            let braceDepth = 0;
            let converted = "";

            for (let j = 1; j < token.Value.length - 1; j++)
            {
                const char = token.Value[j];
                const nextChar = token.Value[j + 1];

                if (char === '\\')
                {
                    if (nextChar === currentQuote)
                    {
                        converted += nextChar;
                    }
                    else if (nextChar === this.preferredStringQuote)
                    {
                        converted += `\\${this.preferredStringQuote}`;
                    }
                    else
                    {
                        converted += char + nextChar;
                    }

                    j += 1;

                    continue;
                }
                if (isInterpolationString)
                {
                    if (char === '{')
                    {
                        if (braceDepth === 0 && nextChar === '{')
                        {
                            converted += "{{";
                            j += 1;

                            continue;
                        }

                        braceDepth++;
                    }
                    else if (char === '}')
                    {
                        if (braceDepth > 0)
                        {
                            braceDepth--;
                        }
                        else if (nextChar === '}')
                        {
                            converted += "}}";
                            j += 1;

                            continue;
                        }
                    }
                }

                converted += char === this.preferredStringQuote && braceDepth === 0 ? `\\${this.preferredStringQuote}` : char;
            }

            edits.push({
                range: tokens[i].Range,
                newText: `${this.preferredStringQuote}${converted}${this.preferredStringQuote}`
            });
        }

        return edits;
    }

    private static formatOperators(tokens: Models.Token[]): lsps.TextEdit[]
    {
        const edits: lsps.TextEdit[] = [];
        const spacing = ' '.repeat(this.preferredAssignmentSpacing);

        for (let i = 0; i < tokens.length; i++)
        {
            const current = tokens[i];
            if (!this.isHandledOperator(current.Type))
            {
                continue;
            }

            const prev = tokens[i - 1];
            if (current.Type === Models.TokenType.MINUS && this.isUnaryMinus(prev))
            {
                continue;
            }
            if (current.Type === Models.TokenType.MULTIPLY)
            {
                const tempNextType = tokens[i + 1].Type;
                if (tempNextType === Models.TokenType.COMMA || tempNextType === Models.TokenType.IDENTIFIER || tempNextType === Models.TokenType.MULTIPLY)
                {
                    continue;
                }
            }

            if (prev.Range.end.line === current.Range.start.line)
            {
                edits.push({
                    range: {
                        start: prev.Range.end,
                        end: current.Range.start,
                    },
                    newText: spacing,
                });
            }

            let lookAhead = i + 1;
            while (lookAhead < tokens.length)
            {
                const candidate = tokens[lookAhead];
                if (candidate.Type === Models.TokenType.NEW_LINE)
                {
                    break;
                }
                if (candidate.Range.start.line === current.Range.end.line)
                {
                    edits.push({
                        range: {
                            start: current.Range.end,
                            end: candidate.Range.start,
                        },
                        newText: spacing,
                    });

                    break;
                }

                lookAhead += 1;
            }
        }

        return edits;
    }

    private static formatPunctuation(tokens: Models.Token[]): lsps.TextEdit[]
    {
        const edits: lsps.TextEdit[] = [];

        for (let i = 0; i < tokens.length; i++)
        {
            const current = tokens[i];
            if (!this.isHandledPunctuation(current.Type))
            {
                continue;
            }

            const prev = tokens[i - 1];
            if (prev === undefined)
            {
                continue;
            }

            const next = tokens[i + 1];
            if (!next)
            {
                break;
            }

            const spacing = this.getPunctuationFormatting(current.Type, prev.Type, tokens[i - 2], next.Type);
            if (spacing === undefined)
            {
                continue;
            }

            if (prev.Range.end.line === current.Range.start.line && spacing.prevSpace !== undefined)
            {
                edits.push({
                    range: {
                        start: prev.Range.end,
                        end: current.Range.start,
                    },
                    newText: spacing.prevSpace,
                });
            }
            if (next.Type !== Models.TokenType.NEW_LINE && next.Range.start.line === current.Range.end.line && spacing.afterSpace !== undefined)
            {
                edits.push({
                    range: {
                        start: current.Range.end,
                        end: next.Range.start,
                    },
                    newText: spacing.afterSpace,
                });
            }
        }

        return edits;
    }

    private static formatFloats(tokens: Models.Token[]): lsps.TextEdit[]
    {
        const edits: lsps.TextEdit[] = [];

        for (let i = 0; i < tokens.length; i++)
        {
            if (tokens[i].Type !== Models.TokenType.PERIOD)
            {
                continue;
            }

            const next = tokens[i + 1];
            if (next.Type === Models.TokenType.NUMBER)
            {
                const prev = tokens[i - 1];
                if (!prev)
                {
                    continue;
                }
                if (prev.Type !== Models.TokenType.NUMBER)
                {
                    Utils.Logger.logError(`found non-natural float`);
                }

                edits.push({
                    range: {
                        start: tokens[i].Range.start,
                        end: next.Range.end
                    },
                    newText: `0.${next.Value}`
                });
            }
        }

        return edits;
    }

    private static isHandledPunctuation(type: Models.TokenType): boolean
    {
        switch (type)
        {
            case Models.TokenType.L_PAREN:
            case Models.TokenType.R_PAREN:
            case Models.TokenType.L_BRACE:
            case Models.TokenType.R_BRACE:
            case Models.TokenType.L_BRACKET:
            case Models.TokenType.R_BRACKET:
            case Models.TokenType.COLON:
            case Models.TokenType.DEF_TYPE_HINT:
            case Models.TokenType.COMMA:
                return true;

            default:
                return false;
        }
    }

    private static getPunctuationFormatting(currentType: Models.TokenType, prevType: Models.TokenType, prevTwoToken: Models.Token, nextType: Models.TokenType): { prevSpace: string | undefined, afterSpace: string | undefined } | undefined
    {
        //
        //  BASE
        //
        if (currentType === Models.TokenType.COMMA || currentType === Models.TokenType.COLON)
        {
            return { prevSpace: "", afterSpace: " " };
        }
        if (currentType === Models.TokenType.DEF_TYPE_HINT)
        {
            return { prevSpace: " ", afterSpace: " " };
        }
        //
        //  DELIMETERS
        //
        if (currentType === Models.TokenType.L_PAREN || currentType === Models.TokenType.L_BRACKET)
        {
            if (prevTwoToken && (prevTwoToken.Type === Models.TokenType.FUNC || prevTwoToken.Type === Models.TokenType.CLASS))
            {
                return { prevSpace: "", afterSpace: "" };
            }
            if (nextType === Models.TokenType.R_PAREN || nextType === Models.TokenType.R_BRACKET)
            {
                return { prevSpace: undefined, afterSpace: undefined };
            }

            return { prevSpace: undefined, afterSpace: "" };
        }
        if (currentType === Models.TokenType.R_PAREN || currentType === Models.TokenType.R_BRACKET)
        {
            if (prevType === Models.TokenType.COMMA)
            {
                return { prevSpace: undefined, afterSpace: undefined };
            }
            if (prevType === Models.TokenType.L_PAREN || prevType === Models.TokenType.L_BRACKET)
            {
                return { prevSpace: "", afterSpace: undefined };
            }

            return { prevSpace: "", afterSpace: undefined };
        }
        if (currentType === Models.TokenType.L_BRACE)
        {
            if (nextType === Models.TokenType.R_BRACE)
            {
                return { prevSpace: undefined, afterSpace: undefined };
            }

            return { prevSpace: undefined, afterSpace: " " };
        }
        if (currentType === Models.TokenType.R_BRACE)
        {
            if (prevType === Models.TokenType.L_BRACE)
            {
                return { prevSpace: "", afterSpace: undefined };
            }

            return { prevSpace: " ", afterSpace: undefined };
        }

        return undefined;
    }

    private static isHandledOperator(type: Models.TokenType): boolean
    {
        switch (type)
        {
            case Models.TokenType.PLUS:
            case Models.TokenType.MINUS:
            case Models.TokenType.MULTIPLY:
            case Models.TokenType.DIVIDE:
            case Models.TokenType.DIVIDE_FLOOR:
            case Models.TokenType.MOD:
            case Models.TokenType.LEFT_BIT_SHIFT:
            case Models.TokenType.RIGHT_BIT_SHIFT:
            case Models.TokenType.BIT_XOR:
            case Models.TokenType.BIT_OR:
            case Models.TokenType.BIT_AND:
            case Models.TokenType.NOT_EQUALS:
            case Models.TokenType.GREATER:
            case Models.TokenType.GREATER_EQUALS:
            case Models.TokenType.LESSER:
            case Models.TokenType.LESSER_EQUALS:
            case Models.TokenType.EQUALS:
            case Models.TokenType.PLUS_ASSIGN:
            case Models.TokenType.MINUS_ASSIGN:
            case Models.TokenType.MULTIPLY_ASSIGN:
            case Models.TokenType.DIVIDE_ASSIGN:
            case Models.TokenType.MOD_ASSIGN:
            case Models.TokenType.BIT_OR_ASSIGN:
            case Models.TokenType.BIT_XOR_ASSIGN:
            case Models.TokenType.RIGHT_BIT_SHIFT_ASSIGN:
            case Models.TokenType.LEFT_BIT_SHIFT_ASSIGN:
            case Models.TokenType.DIVIDE_FLOOR_ASSIGN:
            case Models.TokenType.BIT_AND_ASSIGN:
            case Models.TokenType.ASSIGN:
                return true;

            default:
                return false;
        }
    }

    private static canEndExpression(type: Models.TokenType): boolean
    {
        switch (type)
        {
            case Models.TokenType.IDENTIFIER:
            case Models.TokenType.NUMBER:
            case Models.TokenType.STRING:
            case Models.TokenType.R_PAREN:
            case Models.TokenType.R_BRACKET:
            case Models.TokenType.R_BRACE:
                return true;

            default:
                return false;
        }
    }

    private static isUnaryMinus(prev: Models.Token): boolean
    {
        return prev === undefined || !this.canEndExpression(prev.Type);
    }
}
