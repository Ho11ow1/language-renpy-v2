import * as Models from "@server/models/index";
import * as Interfaces from "@server/interfaces/index";

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

    private next(): Models.Token | undefined
    {
        return this.tokens[this.current];
    }

    private prev(): Models.Token | undefined
    {
        return this.tokens[this.current - 1];
    }

    private prevTwo(): Models.Token | undefined
    {
        return this.tokens[this.current - 2];
    }

    private enterScope(kind: Models.ScopeType, name?: string): void
    {
        this.scopeStack.push({ kind, depth: this.indentStack.length, name });
    }

    private handleDedent(): void
    {
        this.indentStack.pop();

        while (this.scopeStack.length > 0 && this.scopeStack[this.scopeStack.length - 1].depth > this.indentStack.length)
        {
            this.scopeStack.pop();
        }
    }

    private isEOF(): boolean
    {
        return this.tokens[this.current].Type === Models.TokenType.EOF;
    }
}
