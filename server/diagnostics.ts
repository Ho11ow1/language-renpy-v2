import * as lsps from "vscode-languageserver";
import * as Models from "@server/models/index";
import * as Utils from "@server/utils/index";

export class Diagnostics
{
    private static connection: lsps.Connection;
    private static severityOverrideMap: Map<string, Models.DiagnosticSeverity> = new Map<string, Models.DiagnosticSeverity>();
    private static readonly _diagnosticsMap: Map<string, lsps.Diagnostic[]> = new Map<string, lsps.Diagnostic[]>();
    private static readonly _defaultSupportedAnnotations: Array<string> = new Array<string>("bug", "fix", "todo", "error");
    private static supportedAnnotations: Array<string> = this._defaultSupportedAnnotations;

    public static init(connection: lsps.Connection): void
    {
        this.connection = connection;
    }

    public static overrideSeverity(overrideMap: Map<string, Models.DiagnosticSeverity>): void
    {
        this.severityOverrideMap = overrideMap;
    }

    public static overrideAnnotation(annotationArr: Array<string>): void
    {
        this.supportedAnnotations = annotationArr.length !== 0 ? annotationArr : this._defaultSupportedAnnotations;
    }

    public static clearOverrides(): void
    {
        this.severityOverrideMap.clear();
        this.supportedAnnotations = this._defaultSupportedAnnotations;
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
        const severityOverride = this.severityOverrideMap.get(diagnostic.Descriptor.Id);
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

    public static pushRaw(diagnostic: lsps.Diagnostic, fileUri: string): void
    {
        const diagnostics = this._diagnosticsMap.get(fileUri) ?? [];
        diagnostics.push(diagnostic);

        this._diagnosticsMap.set(fileUri, diagnostics);
    }

    public static pushDiagnostics(fileUri: string): void
    {
        this.connection.sendDiagnostics({
            uri: fileUri,
            diagnostics: this._diagnosticsMap.get(fileUri) ?? []
        });

        this._diagnosticsMap.delete(fileUri);
    }

    public static diagnoseAnnotations(tokens: Models.Token[], uri: string): void
    {
        for (const token of tokens)
        {
            if (token.Type !== Models.TokenType.COMMENT)
            {
                continue;
            }

            const val = token.Value.substring(1).trimStart();
            const split = val.split(' ');
            const key = split[0].endsWith(':') ? split[0].substring(0, split[0].length - 1) : split[0];

            if (this.supportedAnnotations.includes(key.toLowerCase()))
            {
                this.pushRaw({
                    range: token.Range,
                    message: val,
                    source: "Ren'Py v2",
                    severity: this.convertSeverity(Models.DiagnosticSeverity.INFORMATION)
                }, uri);
            }
        }
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
