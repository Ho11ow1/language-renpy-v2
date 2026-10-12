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
    private scopeStack: Interfaces.IScope[] = [{ Kind: Models.ScopeType.ROOT, Depth: -1, Node: undefined }];

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

    public static parseComments(tokens: Models.Token[], document: TextDocument): void
    {
        const parser = new Parser(tokens, document);

        parser.passComments();
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

    private passComments(): void
    {
        while (!this.isEOF())
        {
            const token = this.advance();
            if (token.Type !== Models.TokenType.COMMENT)
            {
                continue;
            }

            switch (token.Value)
            {

            }
        }
    }

    private parseDefinition(): void
    {
        const token = this.advance();
        const scopeKind = this.currentScope().Kind;

        switch (token.Type)
        {
            case Models.TokenType.TAB:
            case Models.TokenType.INDENT:
                this.handleIndent(token);
                break;
            case Models.TokenType.DEDENT:
                this.handleDedent(token);
                break;

            case Models.TokenType.DEFAULT:
            case Models.TokenType.DEFINE:
                if (scopeKind === Models.ScopeType.ROOT)
                {
                    this.parseRenpyVarDef(token);
                }
                break;
            case Models.TokenType.SCREEN:
                if (scopeKind === Models.ScopeType.ROOT)
                {
                    this.parseScreenDef(token);
                }
                break;
            case Models.TokenType.LABEL:
                if (scopeKind === Models.ScopeType.ROOT || scopeKind === Models.ScopeType.LABEL)
                {
                    this.parseLabelDef(token);
                }
                break;
            case Models.TokenType.STYLE:
                if (scopeKind === Models.ScopeType.ROOT)
                {
                    this.parseStyleDef(token);
                }
                break;
            case Models.TokenType.TRANSFORM:
                if (scopeKind === Models.ScopeType.ROOT)
                {
                    this.parseTransformDef(token);
                }
                break;
        }
    }

    // #region DEFINITION
    private parseLabelDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!name)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }
        this.checkNamingRule(name, Models.ScopeType.LABEL);

        let params: param[] = [];
        if (this.peek().Type === Models.TokenType.L_PAREN)
        {
            params = this.getParams();
        }

        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!colon)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_COLON_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: colon.Range.end
        };

        const label = new Models.LabelNode(
            name.Value,
            this.currentDocument.getText(declarationRange),
            declarationRange,
            name.Range,
            lsps.CompletionItemKind.Interface,
            lsps.SymbolKind.Interface,
            { uri: Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), range: token.Range }
        );
        this.parsedNodes.push(label);

        const first = this.getFirstIndentedToken();
        if (!first)
        {
            return;
        }

        this.scopeStack.push({
            Kind: Models.ScopeType.LABEL,
            Depth: first.Range.start.character,
            Node: label
        });

        Utils.Logger.logDebug(`[OPEN SCOPE] LABEL (${label.Name}) set to expected depth ${first.Range.start.character}`);
    }

    private parseScreenDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!name)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }
        this.checkNamingRule(name, Models.ScopeType.SCREEN);

        let params: param[] = [];
        if (this.peek().Type === Models.TokenType.L_PAREN)
        {
            params = this.getParams();
        }
        else
        {
            //
            //  Not really an error but fine for now
            //
            this.pushDiagnostic(Models.ErrorCode.ERR_DELIMETER_EXPECTED, this.peek().Range, undefined);
        }

        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!colon)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_COLON_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: colon.Range.end
        };

        const screen = new Models.ScreenNode(
            name.Value,
            this.currentDocument.getText(declarationRange),
            declarationRange,
            name.Range,
            lsps.CompletionItemKind.Interface,
            lsps.SymbolKind.Interface,
            { uri: Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), range: token.Range }
        );

        this.parsedNodes.push(screen);

        const first = this.getFirstIndentedToken();
        if (!first)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_NON_EMPTY_BLOCK_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        if (first.Type === Models.TokenType.DOC_STRING)
        {
            Utils.Logger.logDebug(`doc string for screen:\n${first.Value.trim()}`);
            screen.Documentation = first.Value.trim();
        }

        this.scopeStack.push({
            Kind: Models.ScopeType.SCREEN,
            Depth: first.Range.start.character,
            Node: screen
        });

        Utils.Logger.logDebug(`[OPEN SCOPE] SCREEN (${screen.Name}) set to expected depth ${first.Range.start.character}`);
    }

    private parseStyleDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER) ?? this.advanceIfExpected(Models.TokenType.DEFAULT);
        if (!name)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }
        this.checkNamingRule(name, Models.ScopeType.STYLE);

        let baseToken: Models.Token | undefined = undefined;
        const hasBase = this.peek().Type === Models.TokenType.IS;
        if (hasBase)
        {
            this.advance();

            const peekType = this.peek().Type;
            if (peekType !== Models.TokenType.IDENTIFIER && peekType !== Models.TokenType.DEFAULT)
            {
                this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

                return;
            }
            else
            {
                baseToken = this.advance();
            }
        }

        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!hasBase && !colon)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_COLON_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: hasBase ? baseToken!.Range.end : name.Range.end
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

        this.parsedNodes.push(style);

        if (!colon)
        {
            return;
        }

        const first = this.getFirstIndentedToken();
        if (!first)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_NON_EMPTY_BLOCK_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        this.scopeStack.push({
            Kind: Models.ScopeType.STYLE,
            Depth: first.Range.start.character,
            Node: style
        });

        Utils.Logger.logDebug(`[OPEN SCOPE] STYLE (${style.Name}) set to expected depth ${first.Range.start.character}`);
    }

    private parseTransformDef(token: Models.Token): void
    {
        const name = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!name)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }
        this.checkNamingRule(name, Models.ScopeType.TRANSFORM);

        let params: param[] = [];
        if (this.peek().Type === Models.TokenType.L_PAREN)
        {
            params = this.getParams();
        }

        const colon = this.advanceIfExpected(Models.TokenType.COLON);
        if (!colon)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_COLON_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        const declarationRange: lsps.Range = {
            start: token.Range.start,
            end: colon.Range.end
        };

        const transform = new Models.TransformNode(
            name.Value,
            this.currentDocument.getText(declarationRange),
            declarationRange,
            name.Range,
            lsps.CompletionItemKind.Struct,
            lsps.SymbolKind.Struct,
            { uri: Utils.DocumentUtils.normalizeUri(this.currentDocument.uri), range: token.Range }
        );

        this.parsedNodes.push(transform);

        const first = this.getFirstIndentedToken();
        if (!first)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_NON_EMPTY_BLOCK_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        this.scopeStack.push({
            Kind: Models.ScopeType.TRANSFORM,
            Depth: first.Range.start.character,
            Node: transform
        });


        Utils.Logger.logDebug(`[OPEN SCOPE] TRANSFORM (${transform.Name}) set to expected depth ${first.Range.start.character}`);
    }

    private parseRenpyVarDef(token: Models.Token): void
    {
        const nameParts: Models.Token[] = [];
        const valueParts: Models.Token[] = [];

        while (!this.isEOF() && (this.peek().Type !== Models.TokenType.NEW_LINE && this.peek().Type !== Models.TokenType.ASSIGN))
        {
            nameParts.push(this.advance());
        }

        const assign = this.advanceIfExpected(Models.TokenType.ASSIGN);
        if (!assign)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_ASSIGNMENT_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));

            return;
        }

        while (!this.isEOF() && this.peek().Type !== Models.TokenType.NEW_LINE)
        {
            valueParts.push(this.advance());
        }
        if (!(valueParts.length > 0))
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_ASSIGNMENT_EXPECTED, assign.Range, undefined, "Expected value");
        }

        const txt = this.currentDocument.getText({
            start: nameParts[0].Range.start,
            end: valueParts.length > 0 ? valueParts[valueParts.length - 1].Range.end : nameParts[nameParts.length - 1].Range.end
        });

        Utils.Logger.logDebug(`${token.Type === Models.TokenType.DEFINE ? "define" : "default"}: ${nameParts.map((part): string => part.Value).join('')} = ${txt}`);
    }
    // #endregion

    // #region REFERENCE

    // #endregion

    // #region UTILS
    private handleIndent(token: Models.Token): void
    {
        if (token.Type === Models.TokenType.TAB)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_UNEXPECTED_TOKEN, token.Range, undefined, token.Value);

            return;
        }

        this.indentStack.push(token.Range.end.character);

        Utils.Logger.logDebug(`prev: ${this.indentStack[this.indentStack.length - 2]} | current: ${this.indentStack[this.indentStack.length - 1]}`);
    }

    private handleDedent(token: Models.Token): void
    {
        const poppedIndent = this.indentStack.pop();
        const currentDepth = this.indentStack[this.indentStack.length - 1] ?? 0;

        while (this.scopeStack.length > 1 && this.scopeStack[this.scopeStack.length - 1].Depth > currentDepth)
        {
            const scope = this.scopeStack.pop();
            if (scope && scope.Node)
            {
                scope.Node.updateRange(token.Range);
            }

            Utils.Logger.logDebug(`[CLOSE SCOPE] (${scope?.Node?.Name} | ${scope?.Node?.Detail} | start: ${scope?.Node?.Range.start.line}, end: ${scope?.Node?.Range.end.line}) dedented from ${poppedIndent} to ${currentDepth}`);
        }

        Utils.Logger.logDebug(`popped: ${poppedIndent} | current: ${this.indentStack[this.indentStack.length - 1]}`);
    }

    //
    //  Handle no-indent labels too here later
    //

    private isInScope(kind: Models.ScopeType): boolean
    {
        return this.scopeStack.some((scope): boolean => scope.Kind === kind);
    }

    private currentScope(): Interfaces.IScope
    {
        return this.scopeStack[this.scopeStack.length - 1];
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

    private getFirstIndentedToken(): Models.Token | undefined
    {
        let lookahead = this.current;

        while (lookahead < this.tokens.length)
        {
            const tokenType = this.tokens[lookahead].Type;
            if (tokenType === Models.TokenType.NEW_LINE || tokenType === Models.TokenType.TAB || tokenType === Models.TokenType.COMMENT)
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
        let hasSeenBareStar = false;
        let hasSeenVarargs = false;
        let hasSeenKwargs = false;
        let bareStarToken: Models.Token | undefined = undefined;

        while (!this.isEOF())
        {
            if (this.peek().Type === Models.TokenType.NEW_LINE || this.peek().Type === Models.TokenType.R_PAREN)
            {
                break;
            }

            if (hasSeenKwargs)
            {
                this.pushDiagnostic(
                    Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                    lsps.Range.create(this.peek().Range.start, this.peek().Range.end),
                    undefined,
                    "No parameters allowed after **kwargs."
                );
            }

            let isVarargs = false;
            let isKwargs = false;

            if (this.peek().Type === Models.TokenType.MULTIPLY)
            {
                const starToken = this.advance();

                if (this.peek().Type === Models.TokenType.MULTIPLY)
                {
                    this.advance();

                    isKwargs = true;

                    if (hasSeenKwargs)
                    {
                        this.pushDiagnostic(
                            Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                            lsps.Range.create(starToken.Range.start, starToken.Range.end),
                            undefined,
                            "Duplicate **kwargs parameter."
                        );
                    }
                    hasSeenKwargs = true;
                }
                else if (!this.isParamNameToken(this.peek().Type))
                {
                    if (hasSeenBareStar)
                    {
                        this.pushDiagnostic(
                            Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                            lsps.Range.create(starToken.Range.start, starToken.Range.end),
                            undefined,
                            "Cannot have multiple bare '*' separators."
                        );
                    }
                    if (hasSeenVarargs)
                    {
                        this.pushDiagnostic(
                            Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                            lsps.Range.create(starToken.Range.start, starToken.Range.end),
                            undefined,
                            "Cannot have bare '*' after *args."
                        );
                    }

                    hasSeenBareStar = true;
                    bareStarToken = starToken;

                    if (this.peek().Type === Models.TokenType.COMMA)
                    {
                        this.advance();
                        if (this.peek().Type === Models.TokenType.R_PAREN)
                        {
                            this.pushDiagnostic(Models.ErrorCode.ERR_TRAILING_COMMA, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));
                        }
                    }

                    continue;
                }
                else
                {
                    // '*args' syntax
                    isVarargs = true;

                    if (hasSeenVarargs)
                    {
                        this.pushDiagnostic(
                            Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                            lsps.Range.create(starToken.Range.start, starToken.Range.end),
                            undefined,
                            "Cannot have multiple *args parameters."
                        );
                    }
                    if (hasSeenBareStar)
                    {
                        this.pushDiagnostic(
                            Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                            lsps.Range.create(starToken.Range.start, starToken.Range.end),
                            undefined,
                            "Cannot have *args after bare '*'."
                        );
                    }

                    hasSeenVarargs = true;
                }
            }

            if (!this.isParamNameToken(this.peek().Type))
            {
                this.pushDiagnostic(Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));
                this.recoverParameterList();

                continue;
            }

            const arg = this.advance();
            tokenArr.push(arg);

            let bracketDepth = 0;
            let parenDepth = 0;
            let braceDepth = 0;
            let hint = "";
            let hasVal = false;
            let valStr = "";

            if (this.peek().Type === Models.TokenType.COLON)
            {
                this.advance();
                const typeTokens: Models.Token[] = [];

                while (!this.isEOF() && this.peek().Type !== Models.TokenType.NEW_LINE)
                {
                    const nextType = this.peek().Type;

                    if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0)
                    {
                        if (nextType === Models.TokenType.ASSIGN || nextType === Models.TokenType.COMMA || nextType === Models.TokenType.R_PAREN)
                        {
                            break;
                        }
                    }
                    if (nextType === Models.TokenType.ASSIGN)
                    {
                        this.pushDiagnostic(Models.ErrorCode.ERR_UNEXPECTED_TOKEN, lsps.Range.create(this.peek().Range.start, this.peek().Range.end), undefined, this.peek().Value);

                        break;
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

                    typeTokens.push(token);
                }

                const lastToken = typeTokens[typeTokens.length - 1];
                if (lastToken?.Type === Models.TokenType.BIT_OR)
                {
                    this.pushDiagnostic(Models.ErrorCode.ERR_TRAILING_PIPE, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));
                }
                if (!hintsAllowed)
                {
                    this.pushDiagnostic(Models.ErrorCode.ERR_TYPE_HINTS_NOT_ALLOWED, lsps.Range.create(this.peek().Range.start, this.peek().Range.end));
                }
                if (bracketDepth !== 0 || parenDepth !== 0 || braceDepth !== 0)
                {
                    this.pushDiagnostic(Models.ErrorCode.ERR_DELIMETER_EXPECTED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));

                    if (this.peek().Type !== Models.TokenType.ASSIGN)
                    {
                        this.recoverParameterList();
                    }
                }
                else
                {
                    hint = typeTokens.map((token): string => token.Value).join('');
                }
            }

            if (this.peek().Type === Models.TokenType.ASSIGN)
            {
                if (isVarargs || isKwargs)
                {
                    this.pushDiagnostic(
                        Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                        lsps.Range.create(this.peek().Range.start, this.peek().Range.end),
                        undefined,
                        "Varargs (*args) and varkwargs (**kwargs) cannot have default values."
                    );
                }

                parenDepth = 0;
                bracketDepth = 0;
                braceDepth = 0;
                hasVal = true;

                if (!hasSeenBareStar && !hasSeenVarargs)
                {
                    hasSeenDefault = true;
                }

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

                valStr = RValueArr.join('');
            }
            else if (hasSeenDefault && !hasSeenBareStar && !hasSeenVarargs && !isVarargs && !isKwargs)
            {
                this.pushDiagnostic(Models.ErrorCode.ERR_DEFAULT_VALUE_BEFORE_REQUIRED_VALUE, lsps.Range.create(arg.Range.start, arg.Range.end));
            }

            paramArr.push({
                token: arg,
                typeHint: hint,
                RValue: {
                    hasDefault: hasVal,
                    value: valStr
                }
            });

            if (this.peek().Type === Models.TokenType.COMMA)
            {
                this.advance();
                if (this.peek().Type === Models.TokenType.R_PAREN)
                {
                    this.pushDiagnostic(Models.ErrorCode.ERR_TRAILING_COMMA, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));
                }
            }
            else if (this.peek().Type !== Models.TokenType.R_PAREN)
            {
                this.pushDiagnostic(Models.ErrorCode.ERR_DELIMETER_EXPECTED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));

                break;
            }
        }

        if (hasSeenBareStar && paramArr.length === 0)
        {
            this.pushDiagnostic(
                Models.ErrorCode.ERR_UNEXPECTED_TOKEN,
                lsps.Range.create(bareStarToken!.Range.start, bareStarToken!.Range.end),
                undefined,
                "Named arguments must follow bare '*'."
            );
        }
        if (this.peek().Type === Models.TokenType.R_PAREN)
        {
            this.advance();
        }
        else
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_DELIMETER_EXPECTED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));
        }

        return paramArr;
    }

    private isParamNameToken(type: Models.TokenType): boolean
    {
        switch (type)
        {
            case Models.TokenType.LABEL:
            case Models.TokenType.SCREEN:
            case Models.TokenType.MENU:
            case Models.TokenType.STYLE:
            case Models.TokenType.IMAGE:
            case Models.TokenType.TRANSFORM:
            case Models.TokenType.DEFAULT:
            case Models.TokenType.DEFINE:
            case Models.TokenType.INIT:
            case Models.TokenType.PYTHON:
            case Models.TokenType.CALL:
            case Models.TokenType.JUMP:
            case Models.TokenType.SHOW:
            case Models.TokenType.HIDE:
            case Models.TokenType.SCENE:
            case Models.TokenType.USE:
            case Models.TokenType.ADD:
            case Models.TokenType.AT:
            case Models.TokenType.AS:
            case Models.TokenType.IDENTIFIER:
                return true;

            default:
                return false;
        }
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

    private getFuncTypeHint(hintsAllowed: boolean = false): string
    {
        this.advance();
        if (this.peek().Type === Models.TokenType.COLON)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_HINT_EXPECTED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));

            return "";
        }

        let bracketDepth = 0;
        let parenDepth = 0;
        const typeTokens: Models.Token[] = [];

        while (!this.isEOF())
        {
            const peekType = this.peek().Type;
            if (peekType === Models.TokenType.NEW_LINE || peekType === Models.TokenType.COLON)
            {
                break;
            }

            const token = this.advance();
            switch (token.Type)
            {
                case Models.TokenType.L_BRACKET: bracketDepth += 1; break;
                case Models.TokenType.R_BRACKET: bracketDepth -= 1; break;
                case Models.TokenType.L_PAREN: parenDepth += 1; break;
                case Models.TokenType.R_PAREN: parenDepth -= 1; break;
            }

            typeTokens.push(token);
        }

        if (bracketDepth != 0 || parenDepth != 0)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_DELIMETER_EXPECTED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));
            this.recoverTypeHint();

            return "";
        }

        const lastToken = typeTokens[typeTokens.length - 1];
        if (lastToken?.Type === Models.TokenType.BIT_OR)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_TRAILING_PIPE, lsps.Range.create(lastToken.Range.start, lastToken.Range.end));

            return "";
        }
        if (!hintsAllowed)
        {
            this.pushDiagnostic(Models.ErrorCode.ERR_TYPE_HINTS_NOT_ALLOWED, lsps.Range.create(this.prev().Range.start, this.prev().Range.end));
        }

        return typeTokens.map((token): string => token.Value).join('');
    }

    private recoverTypeHint(): void
    {
        while (!this.isEOF())
        {
            const peekType = this.peek().Type;
            if (peekType === Models.TokenType.COLON || peekType === Models.TokenType.NEW_LINE)
            {
                break;
            }

            this.advance();
        }
    }

    private pushDiagnostic(rule: Models.NamingRule, range: lsps.Range, relatedInformation?: lsps.DiagnosticRelatedInformation[], ...args: string[]): void;
    private pushDiagnostic(code: Models.ErrorCode, range: lsps.Range, relatedInformation?: lsps.DiagnosticRelatedInformation[], ...args: string[]): void;
    private pushDiagnostic(ruleOrCode: Models.ErrorCode | Models.NamingRule, range: lsps.Range, relatedInformation?: lsps.DiagnosticRelatedInformation[], ...args: string[]): void
    {
        let descriptor: Models.DiagnosticDescriptor | undefined = undefined;

        if (typeof ruleOrCode === "string")
        {
            descriptor = Models.DiagnosticDescriptorRuleMap.get(ruleOrCode);
        }
        else
        {
            descriptor = Models.DiagnosticDescriptorMap.get(ruleOrCode);
        }

        if (!descriptor)
        {
            Utils.Logger.logError(`Missing descriptor in map for: ${ruleOrCode.toString()}`);

            return;
        }

        Diagnostics.push(descriptor.createDiagnostic(range, relatedInformation, ...args), Utils.DocumentUtils.normalizeUri(this.currentDocument.uri));
    }

    private checkNamingRule(token: Models.Token, scopeType: Models.ScopeType): void
    {
        const val = token.Value;
        const range = token.Range;

        switch (scopeType)
        {
            case Models.ScopeType.LABEL:
                if (!Diagnostics.isSnakeCase(val))
                {
                    this.pushDiagnostic(Models.NamingRule.LABELS_SHOULD_BE_SNAKE_CASE, range);
                }
                break;
            case Models.ScopeType.SCREEN:
                if (!Diagnostics.isSnakeCase(val))
                {
                    this.pushDiagnostic(Models.NamingRule.SCREENS_SHOULD_BE_SNAKE_CASE, range);
                }
                break;
            case Models.ScopeType.TRANSFORM:
                if (!Diagnostics.isSnakeCase(val))
                {
                    this.pushDiagnostic(Models.NamingRule.TRANSFORMS_SHOULD_BE_SNAKE_CASE, range);
                }
                break;
            case Models.ScopeType.STYLE:
                if (!Diagnostics.isSnakeCase(val))
                {
                    this.pushDiagnostic(Models.NamingRule.STYLES_SHOULD_BE_SNAKE_CASE, range);
                }
                break;
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
