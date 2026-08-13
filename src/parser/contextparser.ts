import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";

export class ContextParser
{
    private imageDeclRegex: RegExp = /^\s*image\s+([a-zA-Z0-9_\s]+?)\s*[=:]\s*([\s\S]*)$/;
    private imageUsageRegex: RegExp = /\b(?:show|scene|hide)\s+(.+?)(?:\s+at\s+.+|:)?$/;

    private labelDeclRegex: RegExp = /^\s*label\s+(?!_\s*\()([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private labelUsageRegex: RegExp = /\b(?:jump|call)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;

    private transformDeclRegex: RegExp = /^\s*transform\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private transformUsageRegex: RegExp = /\b(?:show|scene|hide)(?:\s+screen)?\s+\w+(?:\s+\w+)?\s+(?:at)\s+([a-zA-Z0-9_]+)/;

    private screenDeclRegex: RegExp = /^\s*screen\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private screenUsage1Regex: RegExp = /\b(?:show|call|hide)\s+(?:screen)\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?/;

    public static tryGetDeclaration(line: string, offset: number): Declaration | undefined
    {
        
        


        return undefined;
    }
}