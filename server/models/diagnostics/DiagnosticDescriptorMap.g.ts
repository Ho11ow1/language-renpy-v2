import * as Models from "@server/models/index";

export const DiagnosticDescriptorMap: Map<Models.ErrorCode, Models.DiagnosticDescriptor> = new Map<Models.ErrorCode, Models.DiagnosticDescriptor>([
    [Models.ErrorCode.ERR_TYPE_HINTS_NOT_ALLOWED, new Models.DiagnosticDescriptor("RPY0080", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Type hints are not allowed in this structure", true)],
    [Models.ErrorCode.ERR_DUPLICATE_LABEL, new Models.DiagnosticDescriptor("RPY0100", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Label ({0}) already exists", true)],
    [Models.ErrorCode.ERR_DUPLICATE_SCREEN, new Models.DiagnosticDescriptor("RPY0101", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Screen ({0}) already exists", true)],
    [Models.ErrorCode.ERR_DUPLICATE_IMAGE, new Models.DiagnosticDescriptor("RPY0102", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Image ({0}) already exists", true)],
    [Models.ErrorCode.ERR_DUPLICATE_TRANSFORM, new Models.DiagnosticDescriptor("RPY0103", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Transform ({0}) already exists", true)],
    [Models.ErrorCode.ERR_COLON_EXPECTED, new Models.DiagnosticDescriptor("RPY0115", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected ':'", true)],
    [Models.ErrorCode.ERR_IDENTIFIER_EXPECTED, new Models.DiagnosticDescriptor("RPY0116", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected Identifier", true)],
    [Models.ErrorCode.ERR_NON_EMPTY_BLOCK_EXPECTED, new Models.DiagnosticDescriptor("RPY0117", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected non-empty block", true)],
    [Models.ErrorCode.ERR_DELIMETER_EXPECTED, new Models.DiagnosticDescriptor("RPY0118", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected delimeter character", true)],
    [Models.ErrorCode.ERR_HINT_EXPECTED, new Models.DiagnosticDescriptor("RPY0119", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Expected python type hint", true)],
    [Models.ErrorCode.ERR_LABEL_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0518", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Label ({0}) is not defined", true)],
    [Models.ErrorCode.ERR_SCREEN_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0519", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Screen ({0}) is not defined", true)],
    [Models.ErrorCode.WRN_IMAGE_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0520", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Image ({0}}) is not defined", false)],
    [Models.ErrorCode.ERR_TRANSFORM_NOT_DEFINED, new Models.DiagnosticDescriptor("RPY0521", "Design", Models.DiagnosticSeverity.ERROR, "", "", "Transform ({0}) is not defined", true)],
    [Models.ErrorCode.ERR_UNEXPECTED_TOKEN, new Models.DiagnosticDescriptor("RPY1028", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Unexpected token ({0})", true)],
    [Models.ErrorCode.ERR_DEFAULT_VALUE_BEFORE_REQUIRED_VALUE, new Models.DiagnosticDescriptor("RPY1737", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Default values should come after required ones", true)],
    [Models.ErrorCode.ERR_TRAILING_COMMA, new Models.DiagnosticDescriptor("RPY8088", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Found trailing ','", true)],
    [Models.ErrorCode.ERR_TRAILING_PIPE, new Models.DiagnosticDescriptor("RPY8089", "Syntax", Models.DiagnosticSeverity.ERROR, "", "", "Found trailing '|'", true)],
]);
