import { TextDocument } from "vscode-languageserver-textdocument";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";

export class Lexer
{
    //
    //  TODO: Expand the keyword match list converter
    //
    private static readonly KEYWORDS: Record<string, Models.TokenType> = {
        "label": Models.TokenType.LABEL,
        "screen": Models.TokenType.SCREEN,
        "default": Models.TokenType.DEFAULT,
        "define": Models.TokenType.DEFINE,
        "return": Models.TokenType.RETURN,
        "class": Models.TokenType.CLASS,
        "def": Models.TokenType.FUNC
    };

    private tokens: Models.Token[] = [];
    private source: string;
    private start: number = 0;
    private current: number = 0;
    private line: number = 0;
    private character: number = 0;
    private startCharacter: number = 0;

    private indentStack: number[] = [0];
    private atLineStart: boolean = true;

    public constructor(source: string)
    {
        this.source = source;
    }

    public static tokenizeDocument(document: TextDocument): Models.Token[]
    {
        const lexer = new Lexer(document.getText());
        return lexer.scanTokens();
    }

    private scanTokens(): Models.Token[]
    {
        while (!this.isEOF())
        {
            this.start = this.current;
            this.startCharacter = this.character;

            if (this.atLineStart)
            {
                this.handleIndentation();
                this.start = this.current;
                this.startCharacter = this.character;
            }

            this.scanToken();
        }
        while (this.indentStack.length > 1)
        {
            this.indentStack.pop();
            this.addToken(Models.TokenType.DEDENT);
        }

        return this.tokens;
    }

    private scanToken(): void
    {
        const c = this.advance();

        switch (c)
        {
            case '!':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.NOT_EQUALS : Models.TokenType.EXCLAMATION);
                break;
            case '-':
                this.addToken(this.advanceIfNextExpected('>') ? Models.TokenType.DEF_TYPE_HINT : Models.TokenType.MINUS);
                break;
            case '>':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.GREATER_EQUALS : Models.TokenType.GREATER);
                break;
            case '<':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.LESSER_EQUALS : Models.TokenType.LESSER);
                break;
            case '=':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.EQUALS : Models.TokenType.ASSIGN);
                break;

            case '.':
                this.addToken(Models.TokenType.PERIOD);
                break;
            case ',':
                this.addToken(Models.TokenType.COMMA);
                break;
            case ':':
                this.addToken(Models.TokenType.COLON);
                break;
            case '(':
                this.addToken(Models.TokenType.L_PAREN);
                break;
            case ')':
                this.addToken(Models.TokenType.R_PAREN);
                break;
            case '{':
                this.addToken(Models.TokenType.L_BRACE);
                break;
            case '}':
                this.addToken(Models.TokenType.R_BRACE);
                break;
            case '[':
                this.addToken(Models.TokenType.L_BRACKET);
                break;
            case ']':
                this.addToken(Models.TokenType.R_BRACKET);
                break;
            case '#':
                while (this.peek() !== '\n' && !this.isEOF())
                {
                    this.advance();
                }
                break;

            case '\n':
                this.line++;
                this.character = 0;
                this.atLineStart = true;
                break;

            case '\r':
            case ' ':
            case '\t':
                break;


            case '"':
            case '\'':
            case '`':
                this.scanString(c);
                break;

            default:
                if (this.isDigit(c))
                {
                    this.scanNumber();
                }
                else if (this.isAlpha(c))
                {
                    this.scanIdentifierOrKeyword();
                }
                break;
        }
    }

    private scanString(quoteChar: string): void
    {
        const isTripleQuote = this.peek() === quoteChar && this.peekNext() === quoteChar;
        if (isTripleQuote)
        {
            this.advance();
            this.advance();
        }

        while (!this.isEOF())
        {
            if (isTripleQuote)
            {
                if (this.peek() === quoteChar && this.peekNext() === quoteChar && this.peekTwoAhead() === quoteChar)
                {
                    this.advance();
                    this.advance();
                    this.advance();

                    break;
                }
            }
            else if (this.peek() === quoteChar)
            {
                this.advance();

                break;
            }

            const c = this.advance();

            if (c === '\\')
            {
                if (!this.isEOF())
                {
                    if (this.peek() === '\n')
                    {
                        this.line++;
                        this.character = 0;
                    }

                    this.advance();
                }
            }
            else if (c === '\n')
            {
                this.line++;
                this.character = 0;
            }
        }

        this.addToken(Models.TokenType.STRING);
    }

    private scanNumber(): void
    {
        while (this.isDigit(this.peek()))
        {
            this.advance();
        }

        if (this.peek() === '.' && this.isDigit(this.peekNext()))
        {
            this.advance();

            while (this.isDigit(this.peek()))
            {
                this.advance();
            }
        }

        this.addToken(Models.TokenType.NUMBER);
    }

    private scanIdentifierOrKeyword(): void
    {
        while (this.isAlphaNumeric(this.peek()))
        {
            this.advance();
        }

        const text = this.source.substring(this.start, this.current);
        const type = Lexer.KEYWORDS[text] ?? Models.TokenType.IDENTIFIER;

        this.addToken(type);
    }

    private handleIndentation(): void
    {
        this.atLineStart = false;

        let indent = 0;
        let tempCurrent = this.current;
        let tempChar = this.character;

        while (tempCurrent < this.source.length)
        {
            const ch = this.source.charAt(tempCurrent);

            if (ch === ' ')
            {
                indent++;
            }
            //
            //  Ren'Py doesn't allow tabs but we kind of have to handle that case anyways, might change later to just ignore tabs or something
            //
            else if (ch === '\t')
            {
                indent += 4;
            }
            else
            {
                break;
            }

            tempCurrent++;
            tempChar++;
        }

        const nextChar = this.source.charAt(tempCurrent);

        if (nextChar === '\r' || nextChar === '\n' || nextChar === '#')
        {
            return;
        }

        this.current = tempCurrent;
        this.character = tempChar;

        const currentIndent = this.indentStack[this.indentStack.length - 1];

        if (indent > currentIndent)
        {
            this.indentStack.push(indent);
            this.addToken(Models.TokenType.INDENT);
        }
        else if (indent < currentIndent)
        {
            while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent)
            {
                this.indentStack.pop();
                this.addToken(Models.TokenType.DEDENT);
            }
        }
    }

    private advance(): string
    {
        const char = this.source.charAt(this.current);

        this.current += 1;
        this.character += 1;

        return char;
    }

    private peek(): string
    {
        return this.isEOF() ? '\0' : this.source.charAt(this.current);
    }

    private peekNext(): string
    {
        return (this.current + 1 >= this.source.length) ? '\0' : this.source.charAt(this.current + 1);
    }

    private peekTwoAhead(): string
    {
        return (this.current + 2 >= this.source.length) ? '\0' : this.source.charAt(this.current + 2);
    }

    private advanceIfNextExpected(expected: string): boolean
    {
        if (this.isEOF() || this.source.charAt(this.current) !== expected)
        {
            return false;
        }

        this.current += 1;
        this.character += 1;

        return true;
    }

    private isEOF(): boolean
    {
        return this.current >= this.source.length;
    }

    private isDigit(c: string): boolean
    {
        return c >= '0' && c <= '9';
    }

    private isAlpha(c: string): boolean
    {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }

    private isAlphaNumeric(c: string): boolean
    {
        return this.isAlpha(c) || this.isDigit(c);
    }

    private addToken(type: Models.TokenType): void
    {
        const text = (type !== Models.TokenType.INDENT && type !== Models.TokenType.DEDENT) ? this.source.substring(this.start, this.current) : "";
        const range = {
            start: { line: this.line, character: this.startCharacter },
            end: { line: this.line, character: this.character }
        };

        this.tokens.push(new Models.Token(type, text, range));
    }
}
