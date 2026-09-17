import * as lsps from "vscode-languageserver/node";
import * as Models from "@server/models/index";

export class Diagnostic
{
    public readonly Descriptor: Models.DiagnosticDescriptor;
    public readonly Range: lsps.Range;
    public readonly RelatedInformation: lsps.DiagnosticRelatedInformation[];
    public readonly MessageArgs: string[];

    public constructor(descriptor: Models.DiagnosticDescriptor, range: lsps.Range, relatedInformation: lsps.DiagnosticRelatedInformation[] = [], messageArgs: string[] = [])
    {
        this.Descriptor = descriptor;
        this.Range = range;
        this.RelatedInformation = relatedInformation;
        this.MessageArgs = messageArgs;
    }

    public getMessage(): string
    {
        return this.Descriptor.formatMessage(...this.MessageArgs);
    }

    public toLspDiagnostic(): lsps.Diagnostic
    {
        return {
            code: this.Descriptor.Id,
            severity: this.convertSeverity(),
            message: this.getMessage(),
            range: this.Range,
            source: "Ren'Py v2",
            relatedInformation: this.RelatedInformation,
        };
    }

    private convertSeverity(): lsps.DiagnosticSeverity
    {
        switch (this.Descriptor.DefaultSeverity)
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
}
