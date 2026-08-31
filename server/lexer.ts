import { TextDocument } from "vscode-languageserver-textdocument";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";

export class Lexer
{
    //
    //  TODO: Expand the keyword match list converter
    //
    private static readonly _keywords: Record<string, Models.TokenType> = {
        "label": Models.TokenType.LABEL,
        "screen": Models.TokenType.SCREEN,
        "menu": Models.TokenType.MENU,
        "style": Models.TokenType.STYLE,
        "image": Models.TokenType.IMAGE,
        "transform": Models.TokenType.TRANSFORM,
        "default": Models.TokenType.DEFAULT,
        "define": Models.TokenType.DEFINE,
        "init": Models.TokenType.INIT,

        "class": Models.TokenType.CLASS,
        "def": Models.TokenType.FUNC,
        "return": Models.TokenType.RETURN,

        "and": Models.TokenType.AND,
        "or": Models.TokenType.OR,
        "if": Models.TokenType.IF,
        "else": Models.TokenType.ELSE,
        "is": Models.TokenType.IS,
        "not": Models.TokenType.NOT,
        "in": Models.TokenType.IN,
        "match": Models.TokenType.MATCH,
        "for": Models.TokenType.FOR,
        "while": Models.TokenType.WHILE,
        "elif": Models.TokenType.ELIF,

        "True": Models.TokenType.TRUE,
        "False": Models.TokenType.FALSE,
        "None": Models.TokenType.NONE
    };

    private tokens: Models.Token[] = [];
    private source: string;
    private start: number = 0;
    private current: number = 0;
    private line: number = 0;
    private character: number = 0;
    private startCharacter: number = 0;
    private startLine: number = 0;

    private indentStack: number[] = [0];
    private atLineStart: boolean = true;
    private hasContentSinceNewline: boolean = false;

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
            this.startLine = this.line;

            if (this.atLineStart)
            {
                this.handleIndentation();
                this.start = this.current;
                this.startCharacter = this.character;
                this.startLine = this.line;
            }

            this.scanToken();
        }
        while (this.indentStack.length > 1)
        {
            this.indentStack.pop();
            this.addToken(Models.TokenType.DEDENT);
        }

        this.addToken(Models.TokenType.EOF);

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
            case '=':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.EQUALS : Models.TokenType.ASSIGN);
                break;
            case '+':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.PLUS_ASSIGN : Models.TokenType.PLUS);
                break;
            case '*':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.MULTIPLY_ASSIGN : Models.TokenType.MULTIPLY);
                break;
            case '%':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.MOD_ASSIGN : Models.TokenType.MOD);
                break;
            case '^':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.BIT_XOR_ASSIGN : Models.TokenType.BIT_XOR);
                break;
            case '|':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.BIT_OR_ASSIGN : Models.TokenType.BIT_OR);
                break;
            case '&':
                this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.BIT_AND_ASSIGN : Models.TokenType.BIT_AND);
                break;
            case '-':
                if (this.advanceIfNextExpected('>'))
                {
                    this.addToken(Models.TokenType.DEF_TYPE_HINT);
                }
                else
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.MINUS_ASSIGN : Models.TokenType.MINUS);
                }
                break;
            case '<':
                if (this.advanceIfNextExpected('<'))
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.LEFT_BIT_SHIFT_ASSIGN : Models.TokenType.LEFT_BIT_SHIFT);
                }
                else
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.LESSER_EQUALS : Models.TokenType.LESSER);
                }
                break;
            case '>':
                if (this.advanceIfNextExpected('>'))
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.RIGHT_BIT_SHIFT_ASSIGN : Models.TokenType.RIGHT_BIT_SHIFT);
                }
                else
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.GREATER_EQUALS : Models.TokenType.GREATER);
                }
                break;
            case '/':
                if (this.advanceIfNextExpected('/'))
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.DIVIDE_FLOOR_ASSIGN : Models.TokenType.DIVIDE_FLOOR);
                }
                else
                {
                    this.addToken(this.advanceIfNextExpected('=') ? Models.TokenType.DIVIDE_ASSIGN : Models.TokenType.DIVIDE);
                }
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
            case '$':
                this.addToken(Models.TokenType.DOLLAR_SIGN_LINE);
                break;
            //
            //  Should help the parser in representing static, class, property, property.setter, etc...
            //  Ultimately the lexer more or less just spews things out and is not meant to be smart
            //  The parser should be handling all the look back for usages and declarations
            //
            case '@':
                this.addToken(Models.TokenType.AT);
                break;
            case '#':
                while (this.peek() !== '\n' && !this.isEOF())
                {
                    this.advance();
                }
                break;

            case '\n':
                if (this.hasContentSinceNewline)
                {
                    this.addToken(Models.TokenType.NEW_LINE);
                }
                this.line++;
                this.character = 0;
                this.atLineStart = true;
                this.hasContentSinceNewline = false;
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
                else
                {
                    this.addToken(Models.TokenType.UNKNOWN);
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
        const type = Lexer._keywords[text] ?? Models.TokenType.IDENTIFIER;

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
        if (type !== Models.TokenType.INDENT && type !== Models.TokenType.DEDENT && type !== Models.TokenType.NEW_LINE)
        {
            this.hasContentSinceNewline = true;
        }

        const text = (type !== Models.TokenType.INDENT && type !== Models.TokenType.DEDENT && type !== Models.TokenType.NEW_LINE && type !== Models.TokenType.EOF) ? this.source.substring(this.start, this.current) : "";
        const range = {
            start: { line: this.startLine, character: this.startCharacter },
            end: { line: this.line, character: this.character }
        };

        this.tokens.push(new Models.Token(type, text, range));
    }
}
