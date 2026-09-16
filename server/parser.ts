import * as lsps from "vscode-languageserver/node";
import * as Models from "@server/models/index";
import * as Interfaces from "@server/interfaces/index";
import * as Utils from "@server/utils/index";
import { Store } from "@server/store";

export class Parser
{
    private tokens: Models.Token[];
    private current: number = 0;

    private indentStack: number[] = [0];
    private scopeStack: Interfaces.IScope[] = [{ depth: 0, kind: Models.ScopeType.ROOT }];
    private menuStack: Models.MenuNode[] = [];
    private labelStack: Models.LabelNode[] = [];

    private parsedNodes: Models.Node[] = [];
    private currentFileUri: string;

    private constructor(tokens: Models.Token[], uri: string)
    {
        this.tokens = tokens;
        this.currentFileUri = uri;
    }

    public static parseDocumentDeclarations(tokens: Models.Token[], uri: string): void
    {
        const parser = new Parser(tokens, uri);

        parser.pass1();
    }

    public static parseDocumentReferences(tokens: Models.Token[], uri: string): void
    {
        const parser = new Parser(tokens, uri);

        parser.pass2();
    }

    private pass1(): void
    {
        while (!this.isEOF())
        {
            this.parseDefinition();
        }

        Store.setDocumentNodes(this.currentFileUri, this.parsedNodes);
    }

    private pass2(): void
    {
        while (!this.isEOF())
        {
            this.parseReferences();
        }
    }

    private parseReferences(): void
    {
        const token = this.advance();

        switch (token.Type)
        {
            //
            //  Yeah
            //
            case Models.TokenType.JUMP:
                this.parseJump();
                break;
            case Models.TokenType.CALL:
                this.parseCall();
                break;

            //
            //  Yeah
            //
            case Models.TokenType.SHOW:
            case Models.TokenType.HIDE:
                this.parseShowHide();
                break;
            case Models.TokenType.SCENE:
                this.parseScene();
                break;

            //
            //  In Screen
            //
            case Models.TokenType.USE:
                break;
            case Models.TokenType.ADD:
                break;

            //
            //  Transfomr
            //
            case Models.TokenType.AT:
                this.parseAt();
                break;
            //
            //  Style
            //
            case Models.TokenType.AS:
                break;
        }
    }

    private parseDefinition(): void
    {
        const token = this.advance();

        switch (token.Type)
        {
            //
            //  Indent logic to hold scope
            //
            case Models.TokenType.INDENT:
                this.handleIndent(token);
                break;
            case Models.TokenType.DEDENT:
                this.handleDedent();
                break;

            //
            //  Yeah
            //
            case Models.TokenType.DEFAULT:
                // Mark as variable
                break;
            case Models.TokenType.DEFINE:
                // Mark as constant
                break;
            case Models.TokenType.STRING:
                if (this.currentScope()?.kind === Models.ScopeType.MENU)
                {
                    this.parseMenuOption(token);
                }
                break;

            //
            //  Special usage things
            //
            case Models.TokenType.LABEL:
                if (!this.isInScope(Models.ScopeType.SCREEN))
                {
                    this.parseLabelDef(token);
                }
                break;
            case Models.TokenType.SCREEN:
                if (!this.isInScope(Models.ScopeType.LABEL))
                {
                    this.parseScreenDef(token);
                }
                break;
            case Models.TokenType.IMAGE:
                if (!this.isInScope(Models.ScopeType.SCREEN))
                {
                    this.parseImageDef(token);
                }
                break;
            case Models.TokenType.MENU:
                this.parseMenuDef(token);
                break;
            case Models.TokenType.TRANSFORM:
                this.parseTransformDef(token);
                break;

            //
            //  Custom python stuff
            //
            case Models.TokenType.CLASS:
                break;
            case Models.TokenType.FUNC:
                break;

            default:
                break;
        }
    }

    // #region DEFINITION
    private parseLabelDef(token: Models.Token): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const fullRange: lsps.Range = {
            start: token.Range.start,
            end: nameToken.Range.end
        };

        const labelNode = new Models.LabelNode(
            nameToken.Value,
            `label ${nameToken.Value}`,
            fullRange,
            nameToken.Range,
            lsps.CompletionItemKind.Interface,
            lsps.SymbolKind.Interface,
            { uri: this.currentFileUri, range: fullRange },
        );

        if (this.labelStack.length === 0)
        {
            this.parsedNodes.push(labelNode);
            labelNode.References.push({ range: nameToken.Range, uri: this.currentFileUri });
        }
        if (this.peek().Type === Models.TokenType.COLON)
        {
            this.pushScope(Models.ScopeType.LABEL, nameToken.Value);
            this.labelStack.push(labelNode);
        }
    }

    private parseScreenDef(token: Models.Token): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const fullRange: lsps.Range = {
            start: token.Range.start,
            end: nameToken.Range.end
        };

        const screenNode = new Models.ScreenNode(
            nameToken.Value,
            `screen ${nameToken.Value}`,
            fullRange,
            nameToken.Range,
            lsps.CompletionItemKind.Interface,
            lsps.SymbolKind.Interface,
            { uri: this.currentFileUri, range: fullRange },
        );

        screenNode.References.push({ range: nameToken.Range, uri: this.currentFileUri });
        this.parsedNodes.push(screenNode);
        this.pushScope(Models.ScopeType.SCREEN, nameToken.Value);
    }

    private parseImageDef(token: Models.Token): void
    {
        const nameTokens: Models.Token[] = [];

        while (this.peek().Type === Models.TokenType.IDENTIFIER)
        {
            nameTokens.push(this.advance());
        }

        if (nameTokens.length === 0)
        {
            // Call diagnostics
            return;
        }

        const imageName = nameTokens.map((t): string => t.Value).join(' ');
        const firstNameToken = nameTokens[0];
        const lastNameToken = nameTokens[nameTokens.length - 1];

        const nextToken = this.peek();

        const fullRange: lsps.Range = {
            start: token.Range.start,
            end: lastNameToken.Range.end
        };
        const selectionRange: lsps.Range = {
            start: firstNameToken.Range.start,
            end: lastNameToken.Range.end
        };

        if (nextToken.Type === Models.TokenType.ASSIGN)
        {
            this.advance();

            const imageNode = new Models.ImageNode(
                imageName,
                `image ${imageName}`,
                fullRange,
                selectionRange,
                lsps.CompletionItemKind.Constant,
                lsps.SymbolKind.Constant,
                { uri: this.currentFileUri, range: fullRange }
            );

            imageNode.References.push({ range: selectionRange, uri: this.currentFileUri });
            this.parsedNodes.push(imageNode);
        }
        else if (nextToken.Type === Models.TokenType.COLON)
        {
            this.advance();

            const imageNode = new Models.ImageNode(
                imageName,
                `image ${imageName}:`,
                fullRange,
                selectionRange,
                lsps.CompletionItemKind.Constant,
                lsps.SymbolKind.Constant,
                { uri: this.currentFileUri, range: fullRange }
            );

            imageNode.References.push({ range: selectionRange, uri: this.currentFileUri });
            this.parsedNodes.push(imageNode);
        }
        else
        {
            // Call diagnostics
        }
    }

    private parseMenuDef(token: Models.Token): void
    {
        let menuName = "menu";
        let isNamed = false;
        let nameRange = token.Range;

        if (this.peek().Type === Models.TokenType.IDENTIFIER)
        {
            const nameToken = this.advance();

            menuName = nameToken.Value;
            isNamed = true;
            nameRange = nameToken.Range;
        }

        const fullRange: lsps.Range = {
            start: token.Range.start,
            end: nameRange.end
        };

        const menuNode = new Models.MenuNode(
            menuName,
            isNamed ? `menu ${menuName}` : "menu",
            fullRange,
            nameRange,
            lsps.CompletionItemKind.Enum,
            lsps.SymbolKind.Enum,
            isNamed,
            { uri: this.currentFileUri, range: fullRange }
        );
        if (isNamed)
        {
            menuNode.References.push({ range: nameRange, uri: this.currentFileUri });
        }

        if (this.peek().Type === Models.TokenType.COLON)
        {
            this.advance();
        }

        const activeLabel: Models.LabelNode | undefined = (this.labelStack.length > 0) ? this.labelStack[this.labelStack.length - 1] : undefined;
        if (activeLabel)
        {
            activeLabel.addMenu(menuNode);
        }
        else
        {
            this.parsedNodes.push(menuNode);
        }

        this.menuStack.push(menuNode);
        this.pushScope(Models.ScopeType.MENU, menuName);
    }

    private parseMenuOption(stringToken: Models.Token): void
    {
        while (this.peek().Type !== Models.TokenType.COLON)
        {
            if (this.peek().Type === Models.TokenType.NEW_LINE || this.peek().Type === Models.TokenType.DEDENT)
            {
                return;
            }

            this.advance();
        }

        if (this.peek().Type !== Models.TokenType.COLON)
        {
            return;
        }

        const activeMenu = this.menuStack[this.menuStack.length - 1];
        if (activeMenu)
        {
            const optionRange: lsps.Range = {
                start: stringToken.Range.start,
                end: stringToken.Range.end
            };

            activeMenu.addOption({
                Option: stringToken.Value,
                Range: optionRange
            });
        }
    }

    private parseTransformDef(token: Models.Token): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken)
        {
            // Call diagnostics
            return;
        }

        const nameRange = nameToken.Range;
        const fullRange: lsps.Range = {
            start: token.Range.start,
            end: nameToken.Range.end
        };

        const transformNode = new Models.TransformNode(
            nameToken.Value,
            `transform ${nameToken.Value}`,
            fullRange,
            nameRange,
            lsps.CompletionItemKind.Constant,
            lsps.SymbolKind.Constant,
            { uri: this.currentFileUri, range: fullRange }
        );
        transformNode.References.push({ uri: this.currentFileUri, range: fullRange });
        this.parsedNodes.push(transformNode);
    }
    // #endregion

    // #region REFERENCE
    private parseJump(): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const node = Store.getLabel(nameToken.Value);
        if (!node)
        {
            // Call Diagnostics
            return;
        }

        node.addReference({ uri: this.currentFileUri, range: nameToken.Range });
    }

    private parseCall(): void
    {
        if (this.peek().Type === Models.TokenType.SCREEN)
        {
            this.advance();
            this.resolveScreenRef();
            return;
        }

        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const node = Store.getLabel(nameToken.Value);
        if (!node)
        {
            // Call diagnostics
            return;
        }

        node.addReference({ uri: this.currentFileUri, range: nameToken.Range });
    }

    private parseShowHide(): void
    {
        if (this.peek().Type === Models.TokenType.SCREEN)
        {
            this.advance();
            this.resolveScreenRef();
            return;
        }

        this.parseScene();
    }

    private resolveScreenRef(): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const node = Store.getScreen(nameToken.Value);
        if (!node)
        {
            // Call diagnostics
            return;
        }

        node.addReference({ uri: this.currentFileUri, range: nameToken.Range });
    }

    private parseScene(): void
    {
        const nameTokens: Models.Token[] = [];

        while (this.peek().Type === Models.TokenType.IDENTIFIER)
        {
            nameTokens.push(this.advance());
        }

        if (nameTokens.length === 0)
        {
            // Call diagnostics
            return;
        }

        const imageName = nameTokens.map((t): string => t.Value).join(' ');
        const fullRange: lsps.Range = {
            start: nameTokens[0].Range.start,
            end: nameTokens[nameTokens.length - 1].Range.end
        };

        const node = Store.getImage(imageName);
        if (!node)
        {
            // Call diagnostics
            return;
        }

        node.addReference({ uri: this.currentFileUri, range: fullRange });
    }

    private parseAt(): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }

        const node = Store.getTransform(nameToken.Value);
        if (!node)
        {
            // Call diagnostics
            return;
        }

        node.addReference({ uri: this.currentFileUri, range: nameToken.Range });
    }
    // #endregion

    // #region UTILS
    private advance(): Models.Token
    {
        const token = this.tokens[this.current];

        this.current += 1;

        return token;
    }

    private prev(): Models.Token | undefined
    {
        return ((this.current - 2) < 0 ? undefined : this.tokens[this.current - 2]);
    }

    private prevTwo(): Models.Token | undefined
    {
        return ((this.current - 3) < 0 ? undefined : this.tokens[this.current - 3]);
    }

    private peek(): Models.Token
    {
        return this.tokens[this.current];
    }

    private handleIndent(token: Models.Token): void
    {
        this.indentStack.push(this.indentStack.length);
    }

    private handleDedent(): void
    {
        if (this.indentStack.length > 1)
        {
            this.indentStack.pop();
        }

        const currentDepth = this.currentDepth();
        while (this.scopeStack.length > 1 && this.scopeStack[this.scopeStack.length - 1].depth >= currentDepth)
        {
            const poppedScope = this.scopeStack.pop();

            if (poppedScope?.kind === Models.ScopeType.LABEL)
            {
                this.labelStack.pop();
            }
            else if (poppedScope?.kind === Models.ScopeType.MENU)
            {
                this.menuStack.pop();
            }
        }
    }

    private currentDepth(): number
    {
        return this.indentStack[this.indentStack.length - 1];
    }

    private pushScope(kind: Models.ScopeType, name?: string): void
    {
        this.scopeStack.push({ kind, depth: this.currentDepth(), name });
    }

    private isInScope(kind: Models.ScopeType): boolean
    {
        return this.scopeStack.some((scope): boolean => scope.kind === kind);
    }

    private currentScope(): Interfaces.IScope | undefined
    {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    private advanceIfExpected(expected: Models.TokenType): { success: boolean, token?: Models.Token }
    {
        if (this.isEOF() || this.peek().Type !== expected)
        {
            return { success: false, token: undefined };
        }

        return { success: true, token: this.advance() };
    }

    private isEOF(): boolean
    {
        return this.peek().Type === Models.TokenType.EOF;
    }
    // #endregion
}
