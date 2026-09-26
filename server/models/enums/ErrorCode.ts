export enum ErrorCode
{
    ERR_TYPE_HINTS_NOT_ALLOWED = 80, // Syntax, ERROR, true, "Type hints are not allowed in this structure"

    ERR_DUPLICATE_LABEL = 100, // Design, ERROR, true, "Label ({0}) already exists"
    ERR_DUPLICATE_SCREEN = 101, // Design, ERROR, true, "Screen ({0}) already exists"
    ERR_DUPLICATE_IMAGE = 102, // Design, ERROR, true, "Image ({0}) already exists"
    ERR_DUPLICATE_TRANSFORM = 103, // Design, ERROR, true, "Transform ({0}) already exists"

    ERR_COLON_EXPECTED = 115, // Syntax, ERROR, true, "Expected ':'"
    ERR_IDENTIFIER_EXPECTED = 116, // Syntax, ERROR, true, "Expected Identifier"
    ERR_NON_EMPTY_BLOCK_EXPECTED = 117, // Syntax, ERROR, true, "Expected non-empty block"
    ERR_DELIMETER_EXPECTED = 118, // Syntax, ERROR, true, "Expected delimeter character"
    ERR_HINT_EXPECTED = 119, // Syntax, ERROR, true, "Expected python type hint"

    ERR_LABEL_NOT_DEFINED = 518, // Design, ERROR, true, "Label ({0}) is not defined"
    ERR_SCREEN_NOT_DEFINED = 519, // Design, ERROR, true, "Screen ({0}) is not defined"
    WRN_IMAGE_NOT_DEFINED = 520, // Design, WARNING, false, "Image ({0}}) is not defined"
    ERR_TRANSFORM_NOT_DEFINED = 521, // Design, ERROR, true, "Transform ({0}) is not defined"

    ERR_UNEXPECTED_TOKEN = 1028, // Syntax, ERROR, true, "Unexpected token ({0})"

    ERR_DEFAULT_VALUE_BEFORE_REQUIRED_VALUE = 1737, // Syntax, ERROR, true, "Default values should come after required ones"

    ERR_TRAILING_COMMA = 8088, // Syntax, ERROR, true, Found trailing ','"
    ERR_TRAILING_PIPE = 8089 // Syntax, ERROR, true, Found trailing '|'"
}
