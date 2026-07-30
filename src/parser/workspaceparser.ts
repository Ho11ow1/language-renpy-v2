import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Store } from "@src/store";
import { Declaration } from "@models/Declaration";
import { LocationInfo } from "@models/LocationInfo";
import { Logger } from "@utils/Logger";
import { HasUnclosedDelimiters, InferTypeFromExpression } from "@utils/Functions";

//
//  TODO: Implement Class and Namespace detection via init python in namespace | class name
//
export class WorkspaceParser
{
    // User-level self declared
    private static globalLabelRegex: RegExp = new RegExp("^label\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static screenRegex: RegExp = new RegExp("^screen\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static persistentRegex: RegExp = new RegExp("^(?:default|define)\\s+persistent\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static transformRegex: RegExp = new RegExp("^transform\\s+([a-zA-Z_]\\w*)\\s*(?:\\([^)]*\\))?\\s*:");
    private static variableRegex: RegExp = new RegExp("^(?:default|define)\\s+([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");

    // User-level override
    private static configRegex: RegExp = new RegExp("^(?:default|define)\\s+config\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static buildRegex: RegExp = new RegExp("^(?:default|define)\\s+build\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static guiRegex: RegExp = new RegExp("^(?:default|define)\\s+gui\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static bubbleRegex: RegExp = new RegExp("^(?:default|define)\\s+bubble\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");
    private static preferencesRegex: RegExp = new RegExp("^(?:default|define)\\s+preferences\\.([a-zA-Z_]\\w*)\\s*=\\s*(.+)$");

    // Helper to only grab root level items
    private static indentRegex: RegExp = new RegExp("^\\s");

    public static ParseFile(filePath: string): void
    {
        if (!fs.existsSync(filePath))
        {
            return;
        }

        try
        {
            Store.RemoveDeclarationsFromFile(filePath);

            const fileContent = fs.readFileSync(filePath, "utf-8");
            const lines = fileContent.split(new RegExp("\\r?\\n"));

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++)
            {
                const line = lines[lineIndex];

                if (!line || this.indentRegex.test(line) || line.trim().startsWith("#"))
                {
                    continue;
                }

                let fullStatement = line;
                let lookAheadIndex = lineIndex + 1;
                while (HasUnclosedDelimiters(fullStatement) && lookAheadIndex < lines.length)
                {
                    fullStatement += "\n" + lines[lookAheadIndex];
                    lookAheadIndex++;
                }

                lineIndex = lookAheadIndex - 1;

                const location = new LocationInfo(filePath, lineIndex + 1);

                const labelMatch = line.match(this.globalLabelRegex);
                if (labelMatch)
                {
                    const labelName = labelMatch[1];
                    const decl = new Declaration(
                        `label ${labelName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "label",
                        `User-defined label in ${path.basename(filePath)}`,
                        location
                    );
                    Store.RegisterUserSymbol([labelName], decl);
                    continue;
                }

                const screenMatch = line.match(this.screenRegex);
                if (screenMatch)
                {
                    const screenName = screenMatch[1];
                    const decl = new Declaration(
                        `screen ${screenName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "screen",
                        `User-defined screen in ${path.basename(filePath)}`,
                        location
                    );
                    Store.RegisterUserSymbol([screenName], decl);
                    continue;
                }

                const persistentMatch = line.match(this.persistentRegex);
                if (persistentMatch)
                {
                    const varName = persistentMatch[1];
                    const rightHandExpr = persistentMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `persistent.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Persistent variable declared in ${path.basename(filePath)}`,
                        location
                    );
                    Store.RegisterUserSymbol(["persistent", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`persistent.${varName}`, inferredType);
                    }

                    continue;
                }

                const transformMatch = line.match(this.transformRegex);
                if (transformMatch)
                {
                    const transformName = transformMatch[1];
                    const decl = new Declaration(
                        `transform ${transformName}`,
                        vscode.CompletionItemKind.Property,
                        fullStatement.trim(),
                        "transform",
                        `User-defined transform in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol([transformName], decl);

                    continue;
                }

                const varMatch = line.match(this.variableRegex);
                if (varMatch)
                {
                    const varName = varMatch[1];
                    const rightHandExpr = varMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        varName,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `User variable declared in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol([varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(varName, inferredType);
                    }
                    continue;
                }

                const configMatch = line.match(this.configRegex);
                if (configMatch)
                {
                    const varName = configMatch[1];
                    const rightHandExpr = configMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `config.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Config variable overridden in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol(["config", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`config.${varName}`, inferredType);
                    }
                    continue;
                }

                const buildMatch = line.match(this.buildRegex);
                if (buildMatch)
                {
                    const varName = buildMatch[1];
                    const rightHandExpr = buildMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `build.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Build variable overridden in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol(["build", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`build.${varName}`, inferredType);
                    }

                    continue;
                }

                const guiMatch = line.match(this.guiRegex);
                if (guiMatch)
                {
                    const varName = guiMatch[1];
                    const rightHandExpr = guiMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `gui.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `GUI variable overridden in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol(["gui", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`gui.${varName}`, inferredType);
                    }
                    continue;
                }

                const bubbleMatch = line.match(this.bubbleRegex);
                if (bubbleMatch)
                {
                    const varName = bubbleMatch[1];
                    const rightHandExpr = bubbleMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `bubble.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Config variable overridden in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol(["bubble", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`bubble.${varName}`, inferredType);
                    }
                    continue;
                }

                const preferencesMatch = line.match(this.preferencesRegex);
                if (preferencesMatch)
                {
                    const varName = preferencesMatch[1];
                    const rightHandExpr = preferencesMatch[2].trim();
                    const inferredType = InferTypeFromExpression(rightHandExpr);

                    const decl = new Declaration(
                        `preferences.${varName}`,
                        vscode.CompletionItemKind.Variable,
                        fullStatement.trim(),
                        inferredType,
                        `Preference variable overridden in ${path.basename(filePath)}`,
                        location
                    );

                    Store.RegisterUserSymbol(["preferences", varName], decl);

                    if (inferredType !== "Any")
                    {
                        Store.RegisterTypeAlias(`preferences.${varName}`, inferredType);
                    }
                    continue;
                }
            }
        }
        catch (error)
        {
            Logger.LogMessage(`Error parsing file ${filePath}: ${error}`);
        }
    }
}
