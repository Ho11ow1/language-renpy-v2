export interface IDiagnosticIndentState
{
    indentStack: number[];
    bracketDepth: number;
    isContinuedLine: boolean;
    pendingBlockOpen: boolean;
    pendingBlockIndent: number;
    pendingBlockLineIndex: number;
    currentLogicLineIndent: number;
}
