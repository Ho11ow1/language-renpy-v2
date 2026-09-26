import { fileURLToPath, pathToFileURL } from "url";
import * as editorConfig from "editorconfig";
import * as path from "path";
import * as fs from "fs";
import * as Common from "@common/index";
import * as Utils from "@server/utils/index";
import * as Models from "@server/models/index";
import { Diagnostics } from "@server/diagnostics";

export class DocumentUtils
{
    private static cwd: string | undefined = undefined;
    private static readonly _validFileNameRegex: RegExp = /^[a-zA-Z0-9][a-zA-Z0-9_.]*(?:\.rpy|\.rpym)$/;

    public static init(dir: string | undefined): void
    {
        if (dir)
        {
            this.cwd = fileURLToPath(dir);
        }
        else
        {
            this.cwd = dir;
        }
    }

    public static normalizeUri(uri: string): string
    {
        try
        {
            return pathToFileURL(fileURLToPath(uri)).href;
        }
        catch
        {
            return uri;
        }
    }

    public static async getWorkspaceRenpyFilePaths(convertToUri: boolean = false): Promise<string[]>
    {
        if (!this.cwd)
        {
            return [];
        }

        const entries: string[] = [];
        for await (const entry of fs.promises.glob(Common.RENPY_FORMAT_GLOB, { cwd: this.cwd }))
        {
            entries.push(path.resolve(this.cwd, entry));
        }

        return convertToUri ? entries.map((entry): string => this.normalizeUri(entry)) : entries;
    }

    public static async parseEditorConfig(): Promise<void>
    {
        if (!this.cwd)
        {
            return;
        }

        const configPath = path.join(this.cwd, ".editorconfig");
        if (!fs.existsSync(configPath))
        {
            Utils.Logger.logMessage(`No editor config at ${configPath}`);

            return;
        }

        try
        {
            const config = await editorConfig.parse(".rpy");
            const validSeverities = new Set(Object.keys(Models.DiagnosticSeverity));
            const validNamingRules = new Set(Object.keys(Models.NamingRule));

            for (const [key, value] of Object.entries(config))
            {
                const split = key.split(".");
                if (split.length !== 3)
                {
                    continue;
                }

                const [prefix, identifier, property] = split;
                if (property !== "severity")
                {
                    continue;
                }

                const severityKey = String(value).toUpperCase() as keyof typeof Models.DiagnosticSeverity;
                if (!validSeverities.has(severityKey))
                {
                    continue;
                }

                if (prefix === "renpy_diagnostic")
                {
                    if (identifier.length !== 7)
                    {
                        continue;
                    }

                    const errorCodeName = Models.ErrorCode[Number(identifier.substring(3))];
                    if (errorCodeName !== undefined)
                    {
                        Diagnostics.overrideSeverity(identifier.toUpperCase(), Models.DiagnosticSeverity[severityKey]);
                    }
                }
                else if (prefix === "renpy_naming_rule")
                {
                    const namingRuleName = identifier.toUpperCase() as keyof typeof Models.NamingRule;
                    if (validNamingRules.has(namingRuleName))
                    {
                        Diagnostics.overrideSeverity(namingRuleName, Models.DiagnosticSeverity[severityKey]);
                    }
                }
            }
        }
        catch (ex)
        {
            Utils.Logger.logMessage(`Failed to parse ${configPath}: ${ex}`);
        }
    }

    public static isInCwd(path: string): boolean
    {
        if (!this.cwd || !fileURLToPath(path).startsWith(this.cwd))
        {
            return false;
        }

        return true;
    }

    public static isValidFilename(fsPathOrUri: string): boolean
    {
        const filePath = fsPathOrUri.startsWith("file://") ? fileURLToPath(fsPathOrUri) : fsPathOrUri;
        const base = path.basename(filePath);

        return !base.startsWith("00") && this._validFileNameRegex.test(base);
    }
}
