import * as Models from "@server/models/index";

export const DiagnosticDescriptorRuleMap: Map<Models.NamingRule, Models.DiagnosticDescriptor> = new Map<Models.NamingRule, Models.DiagnosticDescriptor>([
    [Models.NamingRule.CLASSES_SHOULD_BE_PASCAL_CASE, new Models.DiagnosticDescriptor("CLASSES_SHOULD_BE_PASCAL_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Classes should be PascalCase", true)],
    [Models.NamingRule.METHODS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("METHODS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Methods should be snake_case", true)],
    [Models.NamingRule.FUNCTIONS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("FUNCTIONS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Functions should be snake_case", true)],
    [Models.NamingRule.FIELDS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("FIELDS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Class fields should be snake_case", true)],
    [Models.NamingRule.PROPERTIES_SHOULD_BE_SCREAMING_SNAKE_CASE, new Models.DiagnosticDescriptor("PROPERTIES_SHOULD_BE_SCREAMING_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Class properties SCREAMING_SNAKE_CASE", true)],
    [Models.NamingRule.SCREENS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("SCREENS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Screens should be snake_case", true)],
    [Models.NamingRule.LABELS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("LABELS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Labels should be snake_case", true)],
    [Models.NamingRule.TRANSFORMS_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("TRANSFORMS_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Transforms should be snake_case", true)],
    [Models.NamingRule.STYLES_SHOULD_BE_SNAKE_CASE, new Models.DiagnosticDescriptor("STYLES_SHOULD_BE_SNAKE_CASE", "Design", Models.DiagnosticSeverity.WARNING, "", "", "Styles should be snake_case", true)],
]);
