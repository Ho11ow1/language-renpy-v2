import * as lsps from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as Models from "@server/models/index";
import * as Interfaces from "@server/interfaces/index";
import * as Utils from "@server/utils/index";
import { Store } from "@server/store";
import { Diagnostics } from "@server/diagnostics";

export class Parser
{
    private tokens: Models.Token[];
    private current: number = 0;
    //
    //  Turns out labels don't need an indented block as they're essentially just C labels so... Yeah
    //  Also with the whole | hey, what about local labels | this should satisfy both cases
    //
    private currentGlobalLabel: Models.LabelNode | undefined = undefined;

    private indentStack: number[] = [0];
    private scopeStack: Interfaces.IScope[] = [];

    private parsedNodes: Models.Node[] = [];
    private currentDocument: TextDocument;

    private constructor(tokens: Models.Token[], document: TextDocument)
    {
        this.tokens = tokens;
        this.currentDocument = document;
    }

    public static parseDocumentDeclarations(tokens: Models.Token[], document: TextDocument): void
    {
        const parser = new Parser(tokens, document);

        parser.pass1();
    }

    public static parseDocumentReferences(tokens: Models.Token[], document: TextDocument): void
    {
        const parser = new Parser(tokens, document);

        parser.pass2();
    }

    private pass1(): void
    {
        while (!this.isEOF())
        {
            this.parseDefinition();
        }

        Store.setDocumentNodes(Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), this.parsedNodes);
    }

    private pass2(): void
    {
        // while (!this.isEOF())
        // {
        //     this.parseReferences();
        // }
    }

    private parseDefinition(): void
    {
        const token = this.advance();

        switch (token.Type)
        {
            case Models.TokenType.TAB:
            case Models.TokenType.INDENT:
                this.handleIndent(token);
                break;
            case Models.TokenType.DEDENT:
                this.handleDedent(token);
                break;

            case Models.TokenType.LABEL:
                if (!this.isInScope(Models.ScopeType.SCREEN))
                {
                    this.parseLabelDef(token);
                }
                break;
            case Models.TokenType.STYLE:
                this.parseStyleDef(token);
                break;
        }
    }

    // #region DEFINITION
    private parseLabelDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!name)
        {
            return;
        }

        let params: param[] = [];
        if (this.peek().Type === Models.TokenType.L_PAREN)
        {
            params = this.getParams();
        }
        if (params.length > 1)
        {
            Utils.Logger.logDebug(`${params.map((param): string => `(${param.token.Value} | ${param.typeHint} | ${param.RValue.value})`)}`);
        }

        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!colon)
        {
            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: name.Range.end
        };

        const label = new Models.LabelNode(
            name.Value,
            this.currentDocument.getText(declarationRange),
            token.Range,
            name.Range,
            lsps.CompletionItemKind.Interface,
            lsps.SymbolKind.Interface,
            { uri: Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), range: token.Range }
        );

        this.scopeStack.push({
            kind: Models.ScopeType.LABEL,
            depth: 0,
            node: label
        });

        Utils.Logger.logDebug(`[OPEN SCOPE] LABEL "${label.Name}" set to expected depth ${0}`);
    }

    private parseStyleDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!name)
        {
            return;
        }
        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!colon)
        {
            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: colon.Range.end
        };

        const style = new Models.StyleNode(
            name.Value,
            this.currentDocument.getText(declarationRange),
            declarationRange,
            name.Range,
            lsps.CompletionItemKind.Struct,
            lsps.SymbolKind.Struct,
            { uri: Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), range: declarationRange }
        );

        const first = this.getFirstIndentedToken();
        if (!first)
        {
            Utils.Logger.logDebug(`[DIAGNOSTIC] Expected non-empty-block Ln: ${name.Range.start.line + 1}, Col: ${0}`);
            return;
        }

        this.scopeStack.push({
            kind: Models.ScopeType.BLOCK,
            depth: first.Range.start.character,
            node: style
        });

        Utils.Logger.logDebug(`[OPEN SCOPE] STYLE "${style.Name}" set to expected depth ${first.Range.start.character}`);
    }
    // #endregion

    // #region REFERENCE

    // #endregion

    // #region UTILS
    private handleIndent(token: Models.Token): void
    {
        if (token.Type === Models.TokenType.TAB)
        {
            // Diagnostics
            Utils.Logger.logDebug(`Tab: ${token.Range.start.character}, ${token.Range.end.character}`);
        }

        this.indentStack.push(token.Range.end.character);

        Utils.Logger.logDebug(`prev: ${this.indentStack[this.indentStack.length - 2]} | current: ${this.indentStack[this.indentStack.length - 1]}`);
    }

    private handleDedent(token: Models.Token): void
    {
        const poppedIndent = this.indentStack.pop();

        Utils.Logger.logDebug(`popped: ${poppedIndent} | current: ${this.indentStack[this.indentStack.length - 1]}`);
    }

    private advance(): Models.Token
    {
        return this.tokens[this.current++];
    }

    private peek(): Models.Token
    {
        return this.tokens[this.current];
    }

    private peekNext(): Models.Token
    {
        return this.tokens[this.current + 1];
    }

    private prev(): Models.Token
    {
        return this.tokens[this.current - 2];
    }

    private advanceIfExpected(expected: Models.TokenType): Models.Token | undefined
    {
        if (this.isEOF() || this.peek().Type !== expected)
        {
            return undefined;
        }

        return this.advance();
    }

    private isEOF(): boolean
    {
        return this.peek().Type === Models.TokenType.EOF;
    }

    private isInScope(kind: Models.ScopeType): boolean
    {
        return this.scopeStack.some((scope): boolean => scope.kind === kind);
    }

    private getFirstIndentedToken(): Models.Token | undefined
    {
        let lookahead = this.current;

        while (lookahead < this.tokens.length)
        {
            const tokenType = this.tokens[lookahead].Type;
            if (tokenType === Models.TokenType.NEW_LINE || tokenType === Models.TokenType.TAB)
            {
                lookahead++;
                continue;
            }
            if (tokenType === Models.TokenType.INDENT)
            {
                return this.tokens[lookahead + 1];
            }

            break;
        }

        return undefined;
    }

    //
    //  TODO: Create delimeter interface to allow for check splitting across multiple functions as TS doesn't have ref on primitives
    //  TODO: Clean up common behaviour
    //
    private getParams(hintsAllowed: boolean = false): param[]
    {
        this.advance();

        if (this.peek().Type === Models.TokenType.R_PAREN)
        {
            this.advance();

            return [];
        }

        const paramArr: param[] = [];
        const tokenArr: Models.Token[] = [];
        let hasSeenDefault = false;

        while (!this.isEOF())
        {
            if (this.peek().Type === Models.TokenType.NEW_LINE || this.peek().Type === Models.TokenType.R_PAREN)
            {
                break;
            }

            const arg = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
            if (!arg)
            {
                Utils.Logger.logDebug(`[DIAGNOSTIC] Expected parameter identifier at Ln: ${this.peek().Range.start.line}, Col: ${this.peek().Range.start.character}`);

                this.recoverParameterList();

                continue;
            }

            tokenArr.push(arg);

            let bracketDepth = 0;
            let parenDepth = 0;
            let braceDepth = 0;
            let hint = "";
            let hasVal = false;
            let val = "";

            if (this.peek().Type === Models.TokenType.COLON)
            {
                this.advance();
                if (!hintsAllowed)
                {
                    Utils.Logger.logDebug(`[DIAGNOSTIC] Type hints are not allowed in this structure: Ln:${this.prev().Range.start.line} Col: ${this.prev().Range.start.character}`);
                }

                const typeParts: string[] = [];

                while (!this.isEOF() && this.peek().Type !== Models.TokenType.NEW_LINE)
                {
                    if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0)
                    {
                        const nextType = this.peek().Type;
                        if (nextType === Models.TokenType.ASSIGN || nextType === Models.TokenType.COMMA || nextType === Models.TokenType.R_PAREN)
                        {
                            break;
                        }
                    }

                    const token = this.advance();
                    switch (token.Type)
                    {
                        case Models.TokenType.L_PAREN: parenDepth += 1; break;
                        case Models.TokenType.R_PAREN: parenDepth -= 1; break;
                        case Models.TokenType.L_BRACE: braceDepth += 1; break;
                        case Models.TokenType.R_BRACE: braceDepth -= 1; break;
                        case Models.TokenType.L_BRACKET: bracketDepth += 1; break;
                        case Models.TokenType.R_BRACKET: bracketDepth -= 1; break;
                    }

                    typeParts.push(token.Value);
                }

                hint = typeParts.join('');
            }

            if (this.peek().Type === Models.TokenType.ASSIGN)
            {
                parenDepth = 0;
                bracketDepth = 0;
                braceDepth = 0;
                hasVal = true;
                hasSeenDefault = true;

                const RValueArr: string[] = [];

                this.advance();

                while (!this.isEOF() && this.peek().Type !== Models.TokenType.NEW_LINE)
                {
                    if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0)
                    {
                        const nextType = this.peek().Type;
                        if (nextType === Models.TokenType.COMMA || nextType === Models.TokenType.R_PAREN)
                        {
                            break;
                        }
                    }

                    const token = this.advance();
                    switch (token.Type)
                    {
                        case Models.TokenType.L_PAREN: parenDepth += 1; break;
                        case Models.TokenType.R_PAREN: parenDepth -= 1; break;
                        case Models.TokenType.L_BRACE: braceDepth += 1; break;
                        case Models.TokenType.R_BRACE: braceDepth -= 1; break;
                        case Models.TokenType.L_BRACKET: bracketDepth += 1; break;
                        case Models.TokenType.R_BRACKET: bracketDepth -= 1; break;
                    }

                    RValueArr.push(token.Value);
                }

                val = RValueArr.join('');
            }
            else
            {
                if (hasSeenDefault)
                {
                    Utils.Logger.logDebug(`[DIAGNOSTIC] Non-default argument "${arg.Value}" follows default argument at Ln: ${arg.Range.start.line}, Col: ${arg.Range.start.character}`);
                }
            }

            paramArr.push({
                token: arg,
                typeHint: hint,
                RValue: {
                    hasDefault: hasVal,
                    value: val
                }
            });

            if (this.peek().Type === Models.TokenType.COMMA)
            {
                this.advance();
                if (this.peek().Type === Models.TokenType.R_PAREN)
                {
                    Utils.Logger.logDebug(`[DIAGNOSTIC] Trailing comma at Ln: ${this.peek().Range.start.line}, Col: ${this.peek().Range.start.character}`);
                }
            }
            else if (this.peek().Type !== Models.TokenType.R_PAREN)
            {
                Utils.Logger.logDebug(`[DIAGNOSTIC] Expected ',' or ')' after parameter "${arg.Value}" at Ln: ${this.peek().Range.start.line}`);

                break;
            }
        }

        if (this.peek().Type === Models.TokenType.R_PAREN)
        {
            this.advance();
        }
        else
        {
            Utils.Logger.logDebug(`[DIAGNOSTIC] Unclosed parameter list starting at line ${this.peek().Range.start.line}`);
        }

        return paramArr;
    }

    private recoverParameterList(): void
    {
        while (!this.isEOF())
        {
            const peekType = this.peek().Type;
            if (peekType === Models.TokenType.COMMA || peekType === Models.TokenType.R_PAREN || peekType === Models.TokenType.NEW_LINE)
            {
                break;
            }

            this.advance();
        }

        if (this.peek().Type === Models.TokenType.COMMA)
        {
            this.advance();
        }
    }
    // #endregion
}

export interface param
{
    RValue: { hasDefault: boolean, value: string };
    typeHint: string;
    token: Models.Token;
}
