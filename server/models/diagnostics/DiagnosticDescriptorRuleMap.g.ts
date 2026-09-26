import * as Models from "@server/models/index";

export const DiagnosticDescriptorRuleMap: Map<Models.NamingRule, Models.DiagnosticDescriptor> = new Map<Models.NamingRule, Models.DiagnosticDescriptor>([
    [Models.NamingRule.CLASSES_SHOULD_BE_PASCAL_CASE, new Models.DiagnosticDescriptor("classes_should_be_pascal_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.METHODS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("methods_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.FUNCTIONS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("functions_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.FIELDS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("fields_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.PROPERTIES_SHOULD_BE_SCREAMING_SNAKE_CASE, new Models.DiagnosticDescriptor("properties_should_be_screaming_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.SCREENS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("screens_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.LABELS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("labels_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
    [Models.NamingRule.TRANSFORMS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("transforms_should_be_snake_case", "Design", Models.DiagnosticSeverity.ERROR, "", "", "", true)],
]);
