import * as lsps from "vscode-languageserver";
import * as Common from "@common/index";
import * as Models from "@server/models/index";

export class Formatter
{
    private static trimTrailingWhitespace: boolean = true;
    private static addEmptyNewLine: boolean = true;
    private static preferredStringQuote: string = '"';

    private static readonly _fileSplitRegex: RegExp = /\r?\n/;
    private static readonly _trailingWhitespaceRegex: RegExp = /\s+$/;

    public static updateConfig(config: Common.IFormatterConfig): void
    {
        this.trimTrailingWhitespace = config.TrimTrailingWhitespace;
        this.addEmptyNewLine = config.AddEmptyNewLine;
        this.preferredStringQuote = config.PreferredStringQuotes;
    }

    public static formatDocument(tokens: Models.Token[], text: string): lsps.TextEdit[]
    {
        const edits: lsps.TextEdit[] = [];

        edits.push(...this.formatLastLine(text, tokens));
        edits.push(...this.formatTrailingWhitespace(text));
        edits.push(...this.formatStrings(tokens));

        return edits;
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
        const strings = tokens.filter((token): boolean => token.Type === Models.TokenType.STRING);

        for (const token of strings)
        {
            const value = token.Value;
            const currentQuote = value[0];
            if (currentQuote === this.preferredStringQuote || value.length < 2)
            {
                continue;
            }

            let converted = "";

            for (let i = 1; i < value.length - 1; i++)
            {
                const char = value[i];

                if (char === '\\')
                {
                    const nextChar = value[i + 1];

                    if (nextChar === currentQuote)
                    {
                        converted += nextChar;
                        i++;

                        continue;
                    }
                    if (nextChar === this.preferredStringQuote)
                    {
                        converted += `\\${this.preferredStringQuote}`;
                        i++;

                        continue;
                    }
                }

                converted += char === this.preferredStringQuote ? `\\${this.preferredStringQuote}` : char;
            }

            edits.push({
                range: token.Range,
                newText: `${this.preferredStringQuote}${converted}${this.preferredStringQuote}`
            });
        }

        return edits;
    }
}
