import * as lsps from "vscode-languageserver";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";

export class Diagnostics
{
    private static connection: lsps.Connection;
    private static readonly _diagnosticsMap: Map<string, lsps.Diagnostic[]> = new Map<string, lsps.Diagnostic[]>();
    private static readonly _severityOverrideMap: Map<string, Models.DiagnosticSeverity> = new Map<string, Models.DiagnosticSeverity>();

    public static init(connection: lsps.Connection): void
    {
        this.connection = connection;
    }

    public static overrideSeverity(diagnosticId: string, severity: Models.DiagnosticSeverity): void
    {
        this._severityOverrideMap.set(diagnosticId, severity);
    }

    public static clear(fileUri: string): void
    {
        this._diagnosticsMap.set(fileUri, []);
        this.connection.sendDiagnostics({
            uri: fileUri,
            diagnostics: []
        });
    }

    public static push(diagnostic: Models.Diagnostic, fileUri: string): void
    {
        const severityOverride = this._severityOverrideMap.get(diagnostic.Descriptor.Id);
        if (!diagnostic.Descriptor.IsEnabledByDefault && severityOverride === undefined)
        {
            return;
        }
        if (severityOverride === Models.DiagnosticSeverity.NONE)
        {
            return;
        }

        const lspDiagnostic = diagnostic.toLspDiagnostic();

        if (severityOverride !== undefined)
        {
            lspDiagnostic.severity = this.convertSeverity(severityOverride);
        }

        const diagnostics = this._diagnosticsMap.get(fileUri) ?? [];
        diagnostics.push(lspDiagnostic);

        this._diagnosticsMap.set(fileUri, diagnostics);
    }

    public static pushDiagnostics(fileUri: string): void
    {
        this.connection.sendDiagnostics({
            uri: fileUri,
            diagnostics: this._diagnosticsMap.get(fileUri) ?? []
        });
    }

    public static pushRawDiagnostic(params: lsps.PublishDiagnosticsParams): void
    {
        this.clear(params.uri);
        this.connection.sendDiagnostics(params);
    }

    private static convertSeverity(severity: Models.DiagnosticSeverity): lsps.DiagnosticSeverity
    {
        switch (severity)
        {
            case Models.DiagnosticSeverity.ERROR:
                return lsps.DiagnosticSeverity.Error;
            case Models.DiagnosticSeverity.WARNING:
                return lsps.DiagnosticSeverity.Warning;
            case Models.DiagnosticSeverity.SUGGESTION:
                return lsps.DiagnosticSeverity.Hint;
            default:
                return lsps.DiagnosticSeverity.Information;
        }
    }

    public static isPascalCase(value: string): boolean
    {
        if (!this.isUppercase(value[0]))
        {
            return false;
        }

        for (let i = 1; i < value.length; i++)
        {
            const c = value[i];

            if (!this.isLetterOrDigit(c))
            {
                return false;
            }
        }

        return true;
    }

    public static isSnakeCase(value: string): boolean
    {
        if (value[value.length - 1] === '_')
        {
            return false;
        }

        let previousWasUnderscore = false;

        for (const character of value)
        {
            if (character === '_')
            {
                if (previousWasUnderscore)
                {
                    return false;
                }

                previousWasUnderscore = true;

                continue;
            }

            if (!this.isLowercase(character) && !this.isDigit(character))
            {
                return false;
            }

            previousWasUnderscore = false;
        }

        return true;
    }

    public static isScreamingSnakeCase(value: string): boolean
    {
        if (value[0] === '_' || value[value.length - 1] === '_')
        {
            return false;
        }

        let previousWasUnderscore = false;

        for (const character of value)
        {
            if (character === '_')
            {
                if (previousWasUnderscore)
                {
                    return false;
                }

                previousWasUnderscore = true;

                continue;
            }

            if (!this.isUppercase(character) && !this.isDigit(character))
            {
                return false;
            }

            previousWasUnderscore = false;
        }

        return true;
    }

    private static isUppercase(c: string): boolean
    {
        return c >= 'A' && c <= 'Z';
    }

    private static isLowercase(c: string): boolean
    {
        return c >= 'a' && c <= 'z';
    }

    private static isDigit(c: string): boolean
    {
        return c >= '0' && c <= '9';
    }

    private static isLetterOrDigit(character: string): boolean
    {
        return this.isUppercase(character) || this.isLowercase(character) || this.isDigit(character);
    }
}
