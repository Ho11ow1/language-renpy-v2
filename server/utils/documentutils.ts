import { fileURLToPath, pathToFileURL } from "url";
import * as path from "path";
import * as fs from "fs";
import * as Common from "@common/index";

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
