import { fileURLToPath, pathToFileURL } from "url";
import * as editorConfig from "editorconfig";
import * as path from "path";
import * as fs from "fs";
import * as Common from "@common/index";
import * as Utils from "@server/utils/index";

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

    public static async getEditorConfig(): Promise<string[] | undefined>
    {
        if (!this.cwd)
        {
            return undefined;
        }

        const configPath = path.join(this.cwd, ".editorconfig");
        if (!fs.existsSync(configPath))
        {
            Utils.Logger.logDebug(`No editor config at ${configPath}`);

            return undefined;
        }

        try
        {
            // The param really doesn't matter as there is no check, it simply bases a lookup off of a path like where the only thing that matters is the extension
            const config = await editorConfig.parse(".rpy");

            for (const [key, value] of Object.entries(config))
            {
                Utils.Logger.logMessage(`${key} = ${value}`);
            }

            return [];
        }
        catch (ex)
        {
            Utils.Logger.logError(`Failed to parse ${configPath}: ${ex}`);

            return undefined;
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
