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
    private scopeStack: Interfaces.IScope[] = [];

    private seen: Map<string, Map<string, Models.Node>> = new Map<string, Map<string, Models.Node>>();
    private parsedNodes: Models.Node[] = [];
    private currentFileUri: string;

    private constructor(tokens: Models.Token[], uri: string)
    {
        this.tokens = tokens;
        this.currentFileUri = uri;
    }

    public static parseDocument(tokens: Models.Token[], uri: string): void
    {
        const parser = new Parser(tokens, uri);

        parser.parseAndStore();
    }

    private parseAndStore(): void
    {
        while (!this.isEOF())
        {
            this.parseDefinition();
        }

        Store.setDocumentNodes(this.currentFileUri, this.parsedNodes);
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
                break;
            case Models.TokenType.DEDENT:
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

            //
            //  Special usage things
            //
            case Models.TokenType.LABEL:
                this.parseLabelDef(token);
                break;
            case Models.TokenType.SCREEN:
                this.parseScreenDef(token);
                break;
            case Models.TokenType.IMAGE:
                this.parseImageDef(token);
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
            { Uri: this.currentFileUri, Range: fullRange },
        );

        this.parsedNodes.push(labelNode);
    }

    private parseScreenDef(token: Models.Token): void
    {
        const { success, token: nameToken } = this.advanceIfExpected(Models.TokenType.IDENTIFIER);
        if (!success || !nameToken || nameToken?.Type === Models.TokenType.EOF)
        {
            // Call diagnostics
            return;
        }
        const prev2 = this.prevTwo();
        if ((prev2 && prev2.Value === "hide") || (prev2 && prev2.Value === "show") || (prev2 && prev2.Value === "call"))
        {
            Utils.Logger.logMessage(`avoiding duplicate: ${nameToken.Value}`);

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
            { Uri: this.currentFileUri, Range: fullRange },
        );

        this.parsedNodes.push(screenNode);
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
                { Uri: this.currentFileUri, Range: fullRange }
            );

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
                { Uri: this.currentFileUri, Range: fullRange }
            );

            this.parsedNodes.push(imageNode);
        }
        else
        {
            // Call diagnostics
        }
    }

    private advance(): Models.Token
    {
        const token = this.tokens[this.current];

        this.current += 1;

        return token;
    }

    //
    //  Current is always one ahead of the current working token
    //  current - 1 would be working
    //  current - 2 is prev
    //  current - 3 is prev of prev
    //  Counter-measure to stop getting duplicate entries for screens for now
    //  This probably won't be necessary when scope is implemented as only grab root or init blocks
    //  Same issue goes for labels in screens but whatever for now
    //
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

    private advanceIfExpected(expected: Models.TokenType): { success: boolean, token?: Models.Token }
    {
        if (this.isEOF() || this.peek().Type !==  expected)
        {
            return { success: false, token: undefined };
        }

        return { success: true, token: this.advance() };
    }

    private isEOF(): boolean
    {
        return this.peek().Type === Models.TokenType.EOF;
    }
}
