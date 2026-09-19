import * as lsps from "vscode-languageserver/node";
import * as Models from "@server/models/index";

export class DiagnosticDescriptor
{
    public readonly Id: string;
    public readonly Category: string;
    public readonly DefaultSeverity: Models.DiagnosticSeverity;
    public readonly Title: string;
    public readonly Description: string;
    public readonly Format: string;
    public readonly IsEnabledByDefault: boolean;

    public constructor(id: string, category: string, defaultSeverity: Models.DiagnosticSeverity, title: string, description: string, format: string, isEnabledByDefault: boolean)
    {
        this.Id = id;
        this.Category = category;
        this.DefaultSeverity = defaultSeverity;
        this.Title = title;
        this.Description = description;
        this.Format = format;
        this.IsEnabledByDefault = isEnabledByDefault;
    }

    public formatMessage(...args: string[]): string
    {
        return this.Format.replace(/\{(\d+)\}/g, (match, idx: number): string => {
            const value = args[idx];

            return value === undefined ? match : value;
        });
    }

    public createDiagnostic(range: lsps.Range, relatedInformation?: lsps.DiagnosticRelatedInformation[], ...args: string[]): Models.Diagnostic
    {
        return new Models.Diagnostic(this, range, relatedInformation, args);
    }
}
