import * as Models from "@server/models/index";

export class Parser
{
    private tokens: Models.Token[];
    private current: number = 0;

    private constructor(tokens: Models.Token[])
    {
        this.tokens = tokens;
    }

    public static parseDocument(tokens: Models.Token[]): void
    {
        const parser = new Parser(tokens);
        
        parser.parseTokens();
    }

    private parseTokens(): void
    {

    }
}
