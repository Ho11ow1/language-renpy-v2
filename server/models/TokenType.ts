//
//  TODO: Expand TokenType list
//
export enum TokenType
{
    LABEL = "label", SCREEN = "screen", DEFAULT = "default", DEFINE = "define", RETURN = "return", CLASS = "class", FUNC = "def",

    L_PAREN = "(", R_PAREN = ")", L_BRACE = "{", R_BRACE = "}", L_BRACKET = "[", R_BRACKET = "]", PERIOD = ".", COMMA = ",",
    EXCLAMATION = "!", NOT_EQUALS = "!=", GREATER = ">", GREATER_EQUALS = ">=", LESSER = "<", LESSER_EQUALS = "<=", EQUALS = "==", ASSIGN = "=", DEF_TYPE_HINT = "->", MINUS = "-", COLON = ":",

    NUMBER = "number",  STRING = "string",
    INDENT = "indent", DEDENT = "dedent", IDENTIFIER = "word"
}
