export interface IFormatterConfig
{
    TrimTrailingWhitespace: boolean;
    TrimLeadingLines: boolean;
    AddEmptyNewLine: boolean;
    ShouldFormatPunctuation: boolean;
    ShouldFormatFloats: boolean;
    ShouldFormatKeywords: boolean;
    PreferredStringQuotes: string;
    PreferredOperatorSpacing: number;
    PreferredParameterStyle: number;
}
