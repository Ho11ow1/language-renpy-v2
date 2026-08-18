import * as path from "path";
import * as vscode from "vscode";
import * as Src from "@src/index";
import * as Models from "@models/index";
import * as Utils from "@utils/index";

export class WorkspaceParser
{
    // Python specific stuff
    private static readonly _initPythonRegex: RegExp = /^\s*(?:init\s+(?:-?\d+\s+)?python(?:\s+in\s+([a-zA-Z_]\w*))?|python)\s*:/;
    private static readonly _classRegex: RegExp = /^\s*class\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _functionRegex: RegExp = /^\s*(?:async\s+)?def\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:/;
    private static readonly _classMemberFieldRegex: RegExp = /^\s*(?:self|cls)\.([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/;

    // General use-case stuff
    private static readonly _labelRegex: RegExp = /^\s*label\s+(?!_\s*\()([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _screenRegex: RegExp = /^\s*screen\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _transformRegex: RegExp = /^\s*transform\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?\s*:/;
    private static readonly _styleRegex: RegExp = /^\s*style\s+([a-zA-Z_]\w*)(?:\s+is\b[^:]*)?\s*:?\s*$/;

    // Variable user-case stuff
    private static readonly _imageRegex: RegExp = /^\s*image\s+([a-zA-Z0-9_\s]+?)\s*[=:]\s*([\s\S]*)$/;
    private static readonly _persistentRegex: RegExp = /^\s*(?:default|define)\s+persistent\.([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/;

    // Explicit variable statements
    private static readonly _renpyVarRegex: RegExp = /^\s*(?:default|define)\s+([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*=\s*([\s\S]+)$/;
    private static readonly _plainVarRegex: RegExp = /^\s*([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/;

    // Built-in overrides
    private static readonly _configRegex: RegExp = /^\s*(?:default|define)\s+config\.([a-zA-Z_]\w*)\s*=\s*(.+)$/;
    private static readonly _buildRegex: RegExp = /^\s*(?:default|define)\s+build\.([a-zA-Z_]\w*)\s*=\s*(.+)$/;
    private static readonly _guiRegex: RegExp = /^\s*(?:default|define)\s+gui\.([a-zA-Z_]\w*)\s*=\s*(.+)$/;
    private static readonly _bubbleRegex: RegExp = /^\s*(?:default|define)\s+bubble\.([a-zA-Z_]\w*)\s*=\s*(.+)$/;
    private static readonly _preferencesRegex: RegExp = /^\s*(?:default|define)\s+preferences\.([a-zA-Z_]\w*)\s*=\s*(.+)$/;

    public static parseFile(document: vscode.TextDocument): void
    {
        const filePath = document.uri.fsPath;
        try
        {
            Src.Store.removeDeclarationsFromFile(filePath);

            const parserScopeState = new Models.ParserScopeState();
            const tabSize = Utils.EditorUtils.getTabSize(document);

            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++)
            {
                const line = document.lineAt(lineIndex).text;
                if (!line || line.trim().startsWith("#"))
                {
                    continue;
                }

                const lineIndent = Utils.ParserUtils.getIndentLevel(line, tabSize);
                parserScopeState.update(lineIndent, line.trim().length);

                let fullStatement = line;
                let lookAheadIndex = lineIndex + 1;
                while (Utils.hasUnclosedDelimiters(fullStatement) && lookAheadIndex < document.lineCount)
                {
                    fullStatement += "\n" + document.lineAt(lookAheadIndex).text;
                    lookAheadIndex++;
                }

                lineIndex = lookAheadIndex - 1;
                const location = new Models.LocationInfo(filePath, lineIndex + 1, (document.lineAt(lineIndex).text).length);

                const pythonBlockMatch = fullStatement.match(this._initPythonRegex);
                if (pythonBlockMatch)
                {
                    if (pythonBlockMatch[1])
                    {
                        parserScopeState.currentNamespace = pythonBlockMatch[1];
                        parserScopeState.namespaceIndent = lineIndent;

                        Src.Store.ensurePathExists([parserScopeState.currentNamespace]);
                    }

                    continue;
                }

                const classMatch = fullStatement.match(this._classRegex);
                if (classMatch)
                {
                    const className = classMatch[1];

                    parserScopeState.currentClass = className;
                    parserScopeState.classIndent = lineIndent;

                    const parentScope = parserScopeState.currentNamespace ? [parserScopeState.currentNamespace] : [];
                    const fullClassName = parentScope.length > 0 ? `${parentScope.join(".")}.${className}` : className;
                    const constructorDetail = Utils.ParserUtils.getClassConstructor(document, lineIndex, lineIndent, className, tabSize);

                    const decl = new Models.Declaration(
                        fullClassName,
                        vscode.CompletionItemKind.Class,
                        fullStatement.trim(),
                        "class",
                        `User class declared in ${path.basename(filePath)}`,
                        location,
                        true,
                        constructorDetail
                    );

                    Src.Store.registerUserSymbol([...parentScope, className], decl);
                    Src.Store.registerTypeAlias(fullClassName, fullClassName);

                    continue;
                }

                const labelMatch = fullStatement.match(this._labelRegex);
                if (labelMatch)
                {
                    parserScopeState.inRenpyBlock = true;
                    parserScopeState.blockIndent = lineIndent;

                    const labelName = labelMatch[1];
                    const decl = new Models.Declaration(
                        `${labelName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "label",
                        `User-defined label in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(["label", labelName], decl);

                    continue;
                }

                const screenMatch = fullStatement.match(this._screenRegex);
                if (screenMatch)
                {
                    parserScopeState.inRenpyBlock = true;
                    parserScopeState.blockIndent = lineIndent;

                    const screenName = screenMatch[1];
                    const decl = new Models.Declaration(
                        `${screenName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "screen",
                        `User-defined screen in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(["screen", screenName], decl);

                    continue;
                }

                const transformMatch = fullStatement.match(this._transformRegex);
                if (transformMatch)
                {
                    parserScopeState.inRenpyBlock = true;
                    parserScopeState.blockIndent = lineIndent;

                    const transformName = transformMatch[1];

                    const decl = new Models.Declaration(
                        `${transformName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "transform",
                        `User-defined transform in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(["transform", transformName], decl);

                    continue;
                }

                const styleMatch = fullStatement.match(this._styleRegex);
                if (styleMatch)
                {
                    parserScopeState.inRenpyBlock = true;
                    parserScopeState.blockIndent = lineIndent;

                    const styleName = styleMatch[1];

                    const decl = new Models.Declaration(
                        `${styleName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "style",
                        `User-defined style in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(["style", styleName], decl);

                    continue;
                }

                const imageMatch = fullStatement.match(this._imageRegex);
                if (imageMatch)
                {
                    const imageName = imageMatch[1].trim();
                    const decl = new Models.Declaration(
                        `${imageName}`,
                        vscode.CompletionItemKind.Value,
                        fullStatement.trim(),
                        "image",
                        `User image defined in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(["image", imageName], decl);

                    continue;
                }

                const persistentMatch = fullStatement.match(this._persistentRegex);
                if (persistentMatch)
                {
                    const varName = persistentMatch[1].trim();
                    const rightHandExpr = persistentMatch[2].trim();
                    const inferredType = Utils.inferTypeFromExpression(rightHandExpr);

                    const decl = new Models.Declaration(
                        `${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Persistent variable declared in ${path.basename(filePath)}`,
                        location
                    );
                    Src.Store.registerUserSymbol(["persistent", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Src.Store.registerTypeAlias(`persistent.${varName}`, inferredType);
                    }

                    continue;
                }

                const defMatch = fullStatement.match(this._functionRegex);
                if (defMatch)
                {
                    const functionName = defMatch[1];
                    parserScopeState.currentFunction = functionName;
                    parserScopeState.functionIndent = lineIndent;

                    if (functionName.startsWith("__") && functionName.endsWith("__") || functionName.startsWith("_"))
                    {
                        continue;
                    }

                    const [isSetter, isVariant, isProperty] = Utils.ParserUtils.getMethodDecorators(document, lineIndex);
                    if (isSetter || isVariant)
                    {
                        continue;
                    }

                    const isMethod = parserScopeState.currentClass !== null;
                    const kind = isProperty ? vscode.CompletionItemKind.Property : (isMethod ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Function);
                    const scopePath = Utils.ParserUtils.getScopePath(parserScopeState.currentNamespace, parserScopeState.currentClass, functionName);
                    const fullName = scopePath.join(".");
                    const declType = isProperty ? "Property" : (isMethod ? "Method" : "Function");
                    const docString = Utils.ParserUtils.getMethodDoc(document, lineIndex);

                    const decl = new Models.Declaration(
                        fullName,
                        kind,
                        fullStatement.trim(),
                        isProperty ? "property" : "function",
                        `${docString !== "" ? docString : `${declType} declared in ${path.basename(filePath)}`}`,
                        location
                    );

                    Src.Store.registerUserSymbol(scopePath, decl);

                    continue;
                }

                if (parserScopeState.currentClass !== null)
                {
                    const selfMatch = fullStatement.match(this._classMemberFieldRegex);
                    if (selfMatch)
                    {
                        const fieldName = selfMatch[1];
                        if (fieldName.startsWith("_"))
                        {
                            continue;
                        }

                        const rightHandExpr = selfMatch[2].trim();
                        const inferredType = Utils.inferTypeFromExpression(rightHandExpr);
                        const scopePath = Utils.ParserUtils.getScopePath(parserScopeState.currentNamespace, parserScopeState.currentClass, fieldName);
                        const fullName = scopePath.join(".");

                        const decl = new Models.Declaration(
                            fullName,
                            vscode.CompletionItemKind.Field,
                            fullStatement.trim(),
                            inferredType,
                            `Property ${fieldName} of ${parserScopeState.currentClass}`,
                            location
                        );

                        Src.Store.registerUserSymbol(scopePath, decl);

                        continue;
                    }
                }

                //
                //  Skip anything inside of functions, screens & labels so we don't catch local vars, screen vars, etc...
                //
                if (parserScopeState.currentFunction !== null || parserScopeState.inRenpyBlock)
                {
                    continue;
                }

                const configMatch = fullStatement.match(this._configRegex);
                if (configMatch) { this.handleOverride("config", configMatch, fullStatement, filePath, location); continue; }

                const buildMatch = fullStatement.match(this._buildRegex);
                if (buildMatch) { this.handleOverride("build", buildMatch, fullStatement, filePath, location); continue; }

                const guiMatch = fullStatement.match(this._guiRegex);
                if (guiMatch) { this.handleOverride("gui", guiMatch, fullStatement, filePath, location); continue; }

                const bubbleMatch = fullStatement.match(this._bubbleRegex);
                if (bubbleMatch) { this.handleOverride("bubble", bubbleMatch, fullStatement, filePath, location); continue; }

                const preferencesMatch = fullStatement.match(this._preferencesRegex);
                if (preferencesMatch) { this.handleOverride("preferences", preferencesMatch, fullStatement, filePath, location); continue; }

                const renpyVarMatch = fullStatement.match(this._renpyVarRegex);
                if (renpyVarMatch)
                {
                    const varPathStr = renpyVarMatch[1];
                    const rightHandExpr = renpyVarMatch[2].trim();
                    const inferredType = Utils.inferTypeFromExpression(rightHandExpr);

                    const varSegments = varPathStr.split(".");
                    const targetKind = parserScopeState.currentClass !== null ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Variable;
                    const scopePath = Utils.ParserUtils.getScopePath(parserScopeState.currentNamespace, parserScopeState.currentClass, ...varSegments);
                    const fullName = scopePath.join(".");

                    const decl = new Models.Declaration(
                        fullName,
                        targetKind,
                        fullStatement.trim(),
                        inferredType,
                        `Variable declared in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(scopePath, decl);

                    if (inferredType !== "Any")
                    {
                        const qualifiedType = Utils.ParserUtils.getQualifiedType(parserScopeState.currentNamespace, inferredType);
                        Src.Store.registerTypeAlias(fullName, qualifiedType);
                    }

                    continue;
                }

                const plainVarMatch = fullStatement.match(this._plainVarRegex);
                if (plainVarMatch && (parserScopeState.currentClass !== null || parserScopeState.currentNamespace !== null))
                {
                    const varName = plainVarMatch[1];
                    const rightHandExpr = plainVarMatch[2].trim();
                    const inferredType = Utils.inferTypeFromExpression(rightHandExpr);

                    const scopePath = Utils.ParserUtils.getScopePath(parserScopeState.currentNamespace, parserScopeState.currentClass, varName);
                    const fullName = scopePath.join(".");

                    const decl = new Models.Declaration(
                        fullName,
                        parserScopeState.currentClass !== null ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Variable declared in ${path.basename(filePath)}`,
                        location
                    );

                    Src.Store.registerUserSymbol(scopePath, decl);

                    if (inferredType !== "Any")
                    {
                        const qualifiedType = Utils.ParserUtils.getQualifiedType(parserScopeState.currentNamespace, inferredType);
                        Src.Store.registerTypeAlias(fullName, qualifiedType);
                    }

                    continue;
                }
            }
        }
        catch (error)
        {
            Utils.Logger.logDebug(`Error parsing file ${filePath}: ${error}`);
        }
    }

    private static handleOverride(prefix: string, match: RegExpMatchArray, fullStatement: string, filePath: string, location: Models.LocationInfo): void
    {
        const varName = match[1];
        const rightHandExpr = match[2].trim();
        const inferredType = Utils.inferTypeFromExpression(rightHandExpr);

        const decl = new Models.Declaration(
            `${prefix}.${varName}`,
            vscode.CompletionItemKind.Variable,
            fullStatement.trim(),
            inferredType,
            `${prefix} variable overridden in ${path.basename(filePath)}`,
            location
        );

        Src.Store.registerUserSymbol([prefix, varName], decl);

        if (inferredType !== "Any")
        {
            Src.Store.registerTypeAlias(`${prefix}.${varName}`, inferredType);
        }
    }
}
