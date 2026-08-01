import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";
import { LocationInfo } from "@models/LocationInfo";
import { Logger } from "@utils/Logger";
import { hasUnclosedDelimiters, inferTypeFromExpression } from "@utils/Functions";

export class WorkspaceParser
{
    // Python specific stuff
    private static initPythonRegex: RegExp = new RegExp("^\\s*(?:init\\s+(?:-?\\d+\\s+)?python(?:\\s+in\\s+([a-zA-Z_]\\w*))?|python)\\s*:");
    private static classRegex: RegExp = new RegExp("^\\s*class\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static functionRegex: RegExp = new RegExp("^\\s*(?:async\\s+)?def\\s+([a-zA-Z_]\\w*)\\s*\\([^)]*\\)\\s*(?:->\\s*[^:]+)?\\s*:");
    private static classMemberFieldRegex: RegExp = new RegExp("^\\s*(?:self|cls)\\.([a-zA-Z_]\\w*)\\s*=\\s*([\\s\\S]+)$");
    private static propertyDecoratorRegex: RegExp = new RegExp("^\\s*@(?:property|[a-zA-Z_]\\w*\\.setter)\\b");
    private static setterDecoratorRegex: RegExp = new RegExp("^\\s*@[a-zA-Z_]\\w*\\.setter\\b");
    private static variantDecoratorRegex: RegExp = new RegExp("^\\s*@[a-zA-Z_]\\w*\\.variant\\b");

    // General use-case stuff
    private static labelRegex: RegExp = new RegExp("^\\s*label\\s+(?!_\\s*\\()([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static screenRegex: RegExp = new RegExp("^\\s*screen\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static transformRegex: RegExp = new RegExp("^\\s*transform\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static styleRegex: RegExp = new RegExp("^\\s*style\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");

    // Variable user-case stuff
    private static imageRegex: RegExp = new RegExp("^\\s*image\\s+([a-zA-Z0-9_\\s]+?)\\s*[=:]\\s*([\\s\\S]*)$");
    private static persistentRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+persistent\\.([a-zA-Z_]\\w*)\\s*=\\s*([\\s\\S]+)$");

    // Explicit variable statements
    private static renpyVarRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+([a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*)\\s*=\\s*([\\s\\S]+)$");
    private static plainVarRegex: RegExp = new RegExp("^\\s*([a-zA-Z_]\\w*)\\s*=\\s*([\\s\\S]+)$");

    // Built-in overrides
    private static configRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+config\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static buildRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+build\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static guiRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+gui\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static bubbleRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+bubble\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static preferencesRegex: RegExp = new RegExp("^\\s*(?:default|define)\\s+preferences\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");

    // Helpers
    private static fileSplitRegex: RegExp = new RegExp("\\r?\\n");
    private static tabRegex: RegExp = new RegExp("\\t", "g");
    private static whitespaceRegex: RegExp = new RegExp("^(\\s*)");

    public static parseFile(filePath: string): void
    {
        if (!fs.existsSync(filePath)) return;

        try
        {
            Store.removeDeclarationsFromFile(filePath);

            const fileContent = fs.readFileSync(filePath, "utf-8");
            const lines = fileContent.split(this.fileSplitRegex);

            let currentNamespace: string | null = null;
            let namespaceIndent: number = -1;

            let currentClass: string | null = null;
            let classIndent: number = -1;

            let currentFunction: string | null = null;
            let functionIndent: number = -1;

            let inRenpyBlock: boolean = false;
            let blockIndent: number = -1;

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++)
            {
                const line = lines[lineIndex];

                if (!line || line.trim().startsWith("#") || line.trim().startsWith("@"))
                {
                    continue;
                }

                const lineIndent = this.getIndentLevel(line);

                if (currentFunction !== null && lineIndent <= functionIndent && line.trim().length > 0)
                {
                    currentFunction = null;
                    functionIndent = -1;
                }

                if (currentClass !== null && lineIndent <= classIndent && line.trim().length > 0)
                {
                    currentClass = null;
                    classIndent = -1;
                }

                if (inRenpyBlock && lineIndent <= blockIndent && line.trim().length > 0)
                {
                    inRenpyBlock = false;
                    blockIndent = -1;
                }

                if (currentNamespace !== null && lineIndent <= namespaceIndent && line.trim().length > 0)
                {
                    currentNamespace = null;
                    namespaceIndent = -1;
                    currentClass = null;
                    classIndent = -1;
                    currentFunction = null;
                    functionIndent = -1;
                }

                let fullStatement = line;
                let lookAheadIndex = lineIndex + 1;
                while (hasUnclosedDelimiters(fullStatement) && lookAheadIndex < lines.length)
                {
                    fullStatement += "\n" + lines[lookAheadIndex];
                    lookAheadIndex++;
                }

                lineIndex = lookAheadIndex - 1;
                const location = new LocationInfo(filePath, lineIndex + 1);

                const pythonBlockMatch = fullStatement.match(this.initPythonRegex);
                if (pythonBlockMatch)
                {
                    if (pythonBlockMatch[1])
                    {
                        currentNamespace = pythonBlockMatch[1];
                        namespaceIndent = lineIndent;
                        Store.ensurePathExists([currentNamespace]);
                    }

                    continue;
                }

                const classMatch = fullStatement.match(this.classRegex);
                if (classMatch)
                {
                    const className = classMatch[1];
                    currentClass = className;
                    classIndent = lineIndent;

                    const parentScope = currentNamespace ? [currentNamespace] : [];
                    const fullClassName = parentScope.length > 0 ? `${parentScope.join(".")}.${className}` : className;

                    const decl = new Declaration(
                        fullClassName,
                        vscode.CompletionItemKind.Class,
                        fullStatement.trim(),
                        "class",
                        `User class declared in ${path.basename(filePath)}`,
                        location
                    );

                    Store.registerUserSymbol([...parentScope, className], decl);
                    Store.registerTypeAlias(fullClassName, fullClassName);

                    continue;
                }

                const labelMatch = fullStatement.match(this.labelRegex);
                if (labelMatch)
                {
                    inRenpyBlock = true;
                    blockIndent = lineIndent;
                    const labelName = labelMatch[1];
                    const decl = new Declaration(
                        `label ${labelName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "label",
                        `User-defined label in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol([labelName], decl);

                    continue;
                }

                const screenMatch = fullStatement.match(this.screenRegex);
                if (screenMatch)
                {
                    inRenpyBlock = true;
                    blockIndent = lineIndent;
                    const screenName = screenMatch[1];
                    const decl = new Declaration(
                        `screen ${screenName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "screen",
                        `User-defined screen in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol([screenName], decl);

                    continue;
                }

                const transformMatch = fullStatement.match(this.transformRegex);
                if (transformMatch)
                {
                    inRenpyBlock = true;
                    blockIndent = lineIndent;
                    const transformName = transformMatch[1];
                    const decl = new Declaration(
                        `transform ${transformName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "transform",
                        `User-defined transform in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol([transformName], decl);

                    continue;
                }

                const styleMatch = fullStatement.match(this.styleRegex);
                if (styleMatch)
                {
                    inRenpyBlock = true;
                    blockIndent = lineIndent;
                    const styleName = styleMatch[1];
                    const decl = new Declaration(
                        `style ${styleName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "style",
                        `User-defined style in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol([styleName], decl);

                    continue;
                }

                const imageMatch = fullStatement.match(this.imageRegex);
                if (imageMatch)
                {
                    const imageName = imageMatch[1].trim();
                    const decl = new Declaration(
                        `image ${imageName}`,
                        vscode.CompletionItemKind.Value,
                        fullStatement.trim(),
                        "image",
                        `User image defined in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol([imageName], decl);

                    continue;
                }

                const persistentMatch = fullStatement.match(this.persistentRegex);
                if (persistentMatch)
                {
                    const varName = persistentMatch[1].trim();
                    const rightHandExpr = persistentMatch[2].trim();
                    const inferredType = inferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `persistent.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Persistent variable declared in ${path.basename(filePath)}`,
                        location
                    );
                    Store.registerUserSymbol(["persistent", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.registerTypeAlias(`persistent.${varName}`, inferredType);
                    }

                    continue;
                }

                const defMatch = fullStatement.match(this.functionRegex);
                if (defMatch)
                {
                    const functionName = defMatch[1];
                    if (functionName.startsWith("__") && functionName.endsWith("__") || functionName.startsWith("_"))
                    {
                        continue;
                    }

                    currentFunction = functionName;
                    functionIndent = lineIndent;

                    let isProperty = false;
                    let isSetter = false;
                    let isVariant = false;
                    let checkIndex = lineIndex - 1;

                    while (checkIndex >= 0)
                    {
                        const prevTrimmed = lines[checkIndex].trim();
                        if (prevTrimmed.length === 0 || prevTrimmed.startsWith("#"))
                        {
                            checkIndex--;
                            continue;
                        }

                        if (prevTrimmed.startsWith("@"))
                        {
                            if (this.propertyDecoratorRegex.test(prevTrimmed))
                            {
                                isProperty = true;
                                if (this.setterDecoratorRegex.test(prevTrimmed))
                                {
                                    isSetter = true;
                                }
                            }
                            if (this.variantDecoratorRegex.test(prevTrimmed))
                            {
                                isVariant = true
                            }
                            checkIndex--;
                            continue;
                        }

                        break;
                    }
                    if (isSetter || isVariant)
                    {
                        continue;
                    }

                    const isMethod = currentClass !== null;
                    let kind = isMethod ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Function;
                    if (isProperty)
                    {
                        kind = vscode.CompletionItemKind.Property;
                    }

                    const scopePath = this.getScopePath(currentNamespace, currentClass, functionName);
                    const fullName = scopePath.join(".");

                    const declType = isProperty ? "Property" : (isMethod ? "Method" : "Function");

                    const decl = new Declaration(
                        fullName,
                        kind,
                        fullStatement.trim(),
                        isProperty ? "property" : "function",
                        `${declType} declared in ${path.basename(filePath)}`,
                        location
                    );

                    Store.registerUserSymbol(scopePath, decl);

                    continue;
                }

                if (currentClass !== null)
                {
                    const selfMatch = fullStatement.match(this.classMemberFieldRegex);
                    if (selfMatch)
                    {
                        const fieldName = selfMatch[1];
                        if (fieldName.startsWith("_"))
                        {
                            continue;
                        }

                        const rightHandExpr = selfMatch[2].trim();
                        const inferredType = inferTypeFromExpression(rightHandExpr);
                        const scopePath = this.getScopePath(currentNamespace, currentClass, fieldName);
                        const fullName = scopePath.join(".");

                        const decl = new Declaration(
                            fullName,
                            vscode.CompletionItemKind.Field,
                            fullStatement.trim(),
                            inferredType,
                            `Property ${fieldName} of ${currentClass}`,
                            location
                        );

                        Store.registerUserSymbol(scopePath, decl);

                        continue;
                    }
                }

                //
                //  Skip anything inside of functions, screens & labels so we don't catch local vars, screen vars, etc...
                //
                if (currentFunction !== null || inRenpyBlock)
                {
                    continue;
                }

                const configMatch = fullStatement.match(this.configRegex);
                if (configMatch) { this.handleOverride("config", configMatch, fullStatement, filePath, location); continue; }

                const buildMatch = fullStatement.match(this.buildRegex);
                if (buildMatch) { this.handleOverride("build", buildMatch, fullStatement, filePath, location); continue; }

                const guiMatch = fullStatement.match(this.guiRegex);
                if (guiMatch) { this.handleOverride("gui", guiMatch, fullStatement, filePath, location); continue; }

                const bubbleMatch = fullStatement.match(this.bubbleRegex);
                if (bubbleMatch) { this.handleOverride("bubble", bubbleMatch, fullStatement, filePath, location); continue; }

                const preferencesMatch = fullStatement.match(this.preferencesRegex);
                if (preferencesMatch) { this.handleOverride("preferences", preferencesMatch, fullStatement, filePath, location); continue; }

                const renpyVarMatch = fullStatement.match(this.renpyVarRegex);
                if (renpyVarMatch)
                {
                    const varPathStr = renpyVarMatch[1];
                    const rightHandExpr = renpyVarMatch[2].trim();
                    const inferredType = inferTypeFromExpression(rightHandExpr);

                    const varSegments = varPathStr.split(".");
                    const targetKind = currentClass !== null ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Variable;

                    const scopePath = this.getScopePath(currentNamespace, currentClass, ...varSegments);
                    const fullName = scopePath.join(".");

                    const decl = new Declaration(
                        fullName,
                        targetKind,
                        fullStatement.trim(),
                        inferredType,
                        `Variable declared in ${path.basename(filePath)}`,
                        location
                    );

                    Store.registerUserSymbol(scopePath, decl);

                    if (inferredType !== "Any")
                    {
                        const qualifiedType = this.getQualifiedType(currentNamespace, inferredType);
                        Store.registerTypeAlias(fullName, qualifiedType);
                    }

                    continue;
                }

                const plainVarMatch = fullStatement.match(this.plainVarRegex);
                if (plainVarMatch && (currentClass !== null || currentNamespace !== null))
                {
                    const varName = plainVarMatch[1];
                    const rightHandExpr = plainVarMatch[2].trim();
                    const inferredType = inferTypeFromExpression(rightHandExpr);

                    const scopePath = this.getScopePath(currentNamespace, currentClass, varName);
                    const fullName = scopePath.join(".");

                    const decl = new Declaration(
                        fullName,
                        currentClass !== null ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Variable declared in ${path.basename(filePath)}`,
                        location
                    );

                    Store.registerUserSymbol(scopePath, decl);

                    if (inferredType !== "Any")
                    {
                        const qualifiedType = this.getQualifiedType(currentNamespace, inferredType);
                        Store.registerTypeAlias(fullName, qualifiedType);
                    }

                    continue;
                }
            }
        }
        catch (error)
        {
            Logger.logMessage(`Error parsing file ${filePath}: ${error}`);
        }
    }

    private static getIndentLevel(line: string): number
    {
        const match = line.match(this.whitespaceRegex);
        if (!match)
        {
            return 0;
        }
        return match[1].replace(this.tabRegex, "    ").length;
    }

    private static getScopePath(currentNamespace: string | null, currentClass: string | null, ...subPaths: string[]): string[]
    {
        const parts = [];

        if (currentNamespace)
        {
            parts.push(currentNamespace);
        }
        if (currentClass)
        {
            parts.push(currentClass);
        }

        return [...parts, ...subPaths];
    };

    private static getQualifiedType(currentNamespace: string | null, typeStr: string): string
    {
        if (currentNamespace && !typeStr.includes(".") && typeStr !== "Any" && typeStr !== "None")
        {
            return `${currentNamespace}.${typeStr}`;
        }

        return typeStr;
    };

    private static handleOverride(prefix: string, match: RegExpMatchArray, fullStatement: string, filePath: string, location: LocationInfo): void
    {
        const varName = match[1];
        const rightHandExpr = match[2].trim();
        const inferredType = inferTypeFromExpression(rightHandExpr);

        const decl = new Declaration(
            `${prefix}.${varName}`,
            vscode.CompletionItemKind.Variable,
            fullStatement.trim(),
            inferredType,
            `${prefix} variable overridden in ${path.basename(filePath)}`,
            location
        );

        Store.registerUserSymbol([prefix, varName], decl);

        if (inferredType !== "Any")
        {
            Store.registerTypeAlias(`${prefix}.${varName}`, inferredType);
        }
    }
}
