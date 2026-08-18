import * as vscode from "vscode";
import * as Models from "@models/index";

export class Declaration
{
    public name: string;                      // Holds the full name e.g. rentale.all_items
    public kind: vscode.CompletionItemKind;   // Holds the auto-completion type of this item, field, method, etc...
    public detail: string;                    // Holds auto-complete info
    public constructorDetail?: string;        // Holds the __init__ params if this is a class
    private staticDetail: string;             // Holds the renpy.json detail as a fallback if no user-override is parsed
    public pythonType: string;                // Holds the python relative type of this item
    public locationInfo?: Models.LocationInfo;       // Holds { filePath: "game/scripts/Characters/Characters.rpy", lineNumber: 4 }
    public documentation?: string;            // Holds a string that will be converted into a hover detail
    private staticDocumentation?: string;     // Holds the renpy.json doc as a fallback if no user-override is parsed or a user removes a declaration override
    public isCustom: boolean;                 // Let's us know if we should delete the entry or just return to static
    public alias?: string;

    public constructor(name: string, kind: vscode.CompletionItemKind, detail: string, pythonType: string = "Any", documentation?: string, locationInfo?: Models.LocationInfo, isCustom: boolean = true, constructorDetail?: string, alias?: string)
    {
        this.name = name;
        this.kind = kind;
        this.detail = detail;
        this.constructorDetail = constructorDetail;
        this.staticDetail = detail;
        this.pythonType = pythonType;
        this.documentation = documentation;
        this.staticDocumentation = documentation;
        this.locationInfo = locationInfo;
        this.isCustom = isCustom;
        this.alias = alias;
    }

    public updateFromWorkspace(detail: string, locationInfo: Models.LocationInfo, pythonType?: string, constructorDetail?: string): void
    {
        this.detail = detail;
        this.locationInfo = locationInfo;
        if (constructorDetail !== undefined)
        {
            this.constructorDetail = constructorDetail;
        }
        if (pythonType && pythonType !== "Any")
        {
            this.pythonType = pythonType;
        }
    }

    public Reset(): void
    {
        this.detail = this.staticDetail;
        this.documentation = this.staticDocumentation;
        this.constructorDetail = undefined;
        this.locationInfo = undefined;
    }

    public AsCompletionItem(prefix?: RegExp): vscode.CompletionItem
    {
        const name = prefix !== undefined ? this.name.replace(prefix, "") : this.name.includes(".") ? this.name.split(".").pop()! : this.name;
        const item = new vscode.CompletionItem(name, this.kind ?? vscode.CompletionItemKind.Module);
        item.detail = this.detail ?? `namespace ${this.name}`;
        item.documentation = this.documentation ? new vscode.MarkdownString(this.documentation) : undefined;

        // const isConstructableClass = this.kind === vscode.CompletionItemKind.Class && this.constructorDetail;
        // const isCallable = this.kind === vscode.CompletionItemKind.Function || this.kind === vscode.CompletionItemKind.Method;

        // if (isConstructableClass || isCallable)
        // {
        //     item.insertText = new vscode.SnippetString(`${name}($1)$0`);
        //     item.command = {
        //         command: "editor.action.triggerParameterHints",
        //         title: "Trigger Parameter hints"
        //     };
        // }

        return item;
    }
}
