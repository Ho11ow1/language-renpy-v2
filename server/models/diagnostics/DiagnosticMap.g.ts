import * as Models from "@server/models/index";

export const DiagnosticDescriptorMap: Map<Models.ErrorCode, Models.DiagnosticDescriptor> = new Map<Models.ErrorCode, Models.DiagnosticDescriptor>([
    [Models.ErrorCode.ERR_DUPLICATE_LABEL, new Models.DiagnosticDescriptor("RPY0100", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Label ({0}) is already defined", true)],
    [Models.ErrorCode.ERR_DUPLICATE_SCREEN, new Models.DiagnosticDescriptor("RPY0101", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Screen ({0}) is already defined", true)],
    [Models.ErrorCode.ERR_DUPLICATE_IMAGE, new Models.DiagnosticDescriptor("RPY0102", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Image ({0}) is already defined", false)],
    [Models.ErrorCode.ERR_DUPLICATE_TRANSFORM, new Models.DiagnosticDescriptor("RPY0103", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Transform ({0}) is already defined", true)],

    [Models.ErrorCode.ERR_COLON_EXPECTED, new Models.DiagnosticDescriptor("RPY0115", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected :", true)],
    [Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, new Models.DiagnosticDescriptor("RPY0116", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected Identifier ", true)],
    [Models.ErrorCode.ERR_NON_EMPTY_BLOCK_EXPECTED, new Models.DiagnosticDescriptor("RPY0116", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Expected something", true)],

    [Models.ErrorCode.ERR_LABEL_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0518", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Label ({0}) is Not Defined", true)],
    [Models.ErrorCode.ERR_SCREEN_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0519", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Screen ({0}) is Not Defined", true)],
    [Models.ErrorCode.WRN_IMAGE_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0520", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Image ({0}) is Not Defined", true)],
    [Models.ErrorCode.ERR_TRANSFORM_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0521", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Transform ({0}) is not defined", true)],
]);
