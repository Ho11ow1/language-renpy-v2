import * as fs from "fs";

export class HTMLParser
{
    private static readonly _htmlUnderscoreTag: string = "<tr class=\"cap\" id=\"cap-_\">";
    private static readonly _htmlXrefOpeningTag: string = "<code class=\"xref\">"
    private static readonly _htmlXrefClosingTag: string = "</code>";

    private static readonly _xrefRegex: RegExp = new RegExp(`${this._htmlXrefOpeningTag}(.+?)${this._htmlXrefClosingTag}`, "g");

    public static parseIndexFileForUnderscore(filePath: string): string[]
    {
        const underscoreVars: string[] = [];
        const htmlContent = fs.readFileSync(filePath, "utf-8");

        const startIndex = htmlContent.indexOf(this._htmlUnderscoreTag);
        if (startIndex === -1)
        {
            return underscoreVars;
        }

        const section = htmlContent.slice(startIndex + this._htmlUnderscoreTag.length);

        let match: RegExpExecArray | null;
        while ((match = this._xrefRegex.exec(section)) !== null)
        {
            underscoreVars.push(match[1]);
        }

        return underscoreVars;
    }
}
