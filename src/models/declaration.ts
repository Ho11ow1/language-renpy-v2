import { LocationInfo } from "./locationInfo";
import * as vscode from "vscode";

export class Declaration
{
    public name: string;                      // Holds the full name e.g. rentale.all_items
    public kind: vscode.CompletionItemKind;   // Holds the auto-completion type of this item, field, method, etc...
    public detail: string;                    // Holds auto-complete info
    private staticDetail: string;             // Holds the renpy.json detail as a fallback if no user-override is parsed
    public pythonType: string;                // Holds the python relative type of this item
    public locationInfo?: LocationInfo;       // Holds { filePath: "game/scripts/Characters/Characters.rpy", lineNumber: 4 } 
    public documentation?: string;            // Holds a string that will be converted into a hover detail

    public constructor(name: string, kind: vscode.CompletionItemKind, detail: string, pythonType: string = "None", documentation?: string, locationInfo?: LocationInfo)
    {
        this.name = name;
        this.kind = kind;
        this.detail = detail;
        this.staticDetail = detail;
        this.pythonType = this.resolveType(pythonType);
        this.documentation = documentation;
        this.locationInfo = locationInfo;
    }

    public UpdateFromWorkspace(detail: string, locationInfo: LocationInfo, pythonType?: string): void
    {
        this.detail = detail;
        this.locationInfo = locationInfo;
        if (pythonType && pythonType !== "None")
        {
            this.pythonType = this.resolveType(pythonType);
        }
    }

    public Reset()
    {
        this.detail = this.staticDetail;
    }

    private resolveType(pythonType: string): string
    {
        

        return "None";
    }
}
