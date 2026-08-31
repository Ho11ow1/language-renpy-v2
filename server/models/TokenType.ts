export enum TokenType
{
    //
    //  RENPY
    //
    LABEL = "label", SCREEN = "screen", MENU = "menu", STYLE = "style", IMAGE = "image", TRANSFORM = "transform", DEFAULT = "default", DEFINE = "define", INIT = "init", DOLLAR_SIGN_LINE = "$",
    //
    //  MATH
    //
    PLUS = "+", MINUS = "-", MULTIPLY = "*", DIVIDE = "/", DIVIDE_FLOOR = "//", MOD = "%", LEFT_BIT_SHIFT = "<<", RIGHT_BIT_SHIFT = ">>", BIT_XOR = "^", BIT_OR = "|", BIT_AND = "&",
    //
    //  LOGIC
    //
    EXCLAMATION = "!", NOT_EQUALS = "!=", GREATER = ">", GREATER_EQUALS = ">=", LESSER = "<", LESSER_EQUALS = "<=", EQUALS = "==",
    ASSIGN = "=", PLUS_ASSIGN = "+=", MINUS_ASSIGN = "-=", MULTIPLY_ASSIGN = "*=", DIVIDE_ASSIGN = "/=", MOD_ASSIGN = "%=", BIT_OR_ASSIGN = "|=", BIT_XOR_ASSIGN = "^=", RIGHT_BIT_SHIFT_ASSIGN = ">>=", LEFT_BIT_SHIFT_ASSIGN = "<<=", DIVIDE_FLOOR_ASSIGN = "//=", BIT_AND_ASSIGN = "&=",
    //
    //  PYTHON
    //
    L_PAREN = "(", R_PAREN = ")", L_BRACE = "{", R_BRACE = "}", L_BRACKET = "[", R_BRACKET = "]", COMMA = ",", AT = "@", DEF_TYPE_HINT = "->",
    CLASS = "class", FUNC = "def", RETURN = "return",
    AND = "and", OR = "or", IF = "if", ELSE = "else", ELIF = "elif", IS = "is", NOT = "not", IN = "in", MATCH = "match", FOR = "for", WHILE = "while",
    //
    //  GENERAL
    //
    PERIOD = ".", TRUE = "True", FALSE = "False", NONE = "None",
    //
    //  OTHER
    //
    NUMBER = "number",  STRING = "string", IDENTIFIER = "word", COLON = ":",
    INDENT = "indent", DEDENT = "dedent", NEW_LINE = "\\n", EOF = "EOF", UNKNOWN = "UNKNOWN",
}
