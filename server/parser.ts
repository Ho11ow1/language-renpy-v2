import * as Models from "@server/models/index";
import * as Interfaces from "@server/interfaces/index";
import * as lsps from "vscode-languageserver/node";

export class Parser
{
    private tokens: Models.Token[];
    private current: number = 0;

    private indentStack: number[] = [0];
    private scopeStack: Interfaces.IScope[] = [];

    private constructor(tokens: Models.Token[])
    {
        this.tokens = tokens;
    }

    public static parseDocument(tokens: Models.Token[]): void
    {
        const parser = new Parser(tokens);

        parser.parseAndStore();
    }

    private parseAndStore(): void
    {
        while (!this.isEOF())
        {
            this.parseDefinition();
        }
    }

    //
    //  Pass 1, just get definitions so that we can then perform the second pass after every parser has finished with all of the referencing
    //
    private parseDefinition(): void
    {
        const token = this.advance();

        switch (token.Type)
        {
            case Models.TokenType.DEFAULT:
                this.handleBasicVar(Models.TokenType.DEFAULT);
                break;
            case Models.TokenType.DEFINE:
                this.handleBasicVar(Models.TokenType.DEFINE);
                break;
            case Models.TokenType.CLASS:

                break;
            case Models.TokenType.FUNC:

                break;

            case Models.TokenType.LABEL:

                break;
            case Models.TokenType.SCREEN:

                break;
            case Models.TokenType.TRANSFORM:

                break;
            case Models.TokenType.STYLE:

                break;
        }
    }

    //
    //  Pass 2, get all usages just like i said above and we can't do them in 1 because this is python where use before declare is a thing
    //
    private parseReference(): void
    {

    }

    private advance(): Models.Token
    {
        const token = this.tokens[this.current];

        this.current += 1;

        return token;
    }

    private peek(): Models.Token
    {
        return this.tokens[this.current];
    }

    private enterScope(kind: Models.ScopeType, name?: string): void
    {
        this.scopeStack.push({ kind, depth: this.indentStack.length, name });
    }

    private addNode(key: string, fullDeclaration: string, kind: lsps.CompletionItemKind): void
    {

    }

    private handleDedent(): void
    {
        this.indentStack.pop();

        while (this.scopeStack.length > 0 && this.scopeStack[this.scopeStack.length - 1].depth > this.indentStack.length)
        {
            this.scopeStack.pop();
        }
    }

    private handleBasicVar(type: Models.TokenType): void
    {
        let key = "";
        let declaration = "";

        this.addNode(key, declaration, type == Models.TokenType.DEFAULT ? lsps.CompletionItemKind.Variable : lsps.CompletionItemKind.Constant);
    }

    private getFuncParams(): string
    {
        let str = "";
        let unclosedParenCount = 0;

        return str;
    }

    private getFuncDocstring(): string
    {
        let str = "";

        return str;
    }

    private isEOF(): boolean
    {
        return this.tokens[this.current].Type === Models.TokenType.EOF;
    }
}
