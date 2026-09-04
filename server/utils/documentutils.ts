import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as Common from "@common/index";
import * as Utils from "@server/utils/index";

export class DocumentUtils
{
    private static cwd: string | undefined = undefined;
    private static readonly _validFileNameRegex: RegExp = /^[a-zA-Z0-9][a-zA-Z0-9_.]*(?:\.rpy|\.rpym)$/;

    public static init(dir: string | undefined)
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

        return convertToUri ? entries.map((entry): string => pathToFileURL(entry).toString()) : entries;
    }

    public static isInCwd(path: string): boolean
    {
        if (!this.cwd || !fileURLToPath(path).startsWith(this.cwd))
        {
            return false;
        }

        return true;
    }

    public static isValidFilename(filePath: string): boolean
    {
        const base = path.basename(fileURLToPath(filePath));

        return !base.startsWith("00") && this._validFileNameRegex.test(base);
    }
}
