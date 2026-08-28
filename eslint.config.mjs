import typescriptEslint from "typescript-eslint";

export default [
    {
        files: ["**/*.ts"],
    },
    {
        plugins: {
            "@typescript-eslint": typescriptEslint.plugin,
        },

        languageOptions: {
            parser: typescriptEslint.parser,
            ecmaVersion: 2022,
            sourceType: "module",
        },

        rules: {
            // =====================================================
            // RETURN TYPES
            // =====================================================
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: false,
                    allowTypedFunctionExpressions: false,
                    allowHigherOrderFunctions: false,
                    allowDirectConstAssertionInArrowFunctions: false,
                },
            ],

            // =====================================================
            // GENERAL JAVASCRIPT SAFETY
            // =====================================================
            "no-unreachable": "error",
            "no-duplicate-imports": "error",
            "no-useless-return": "error",

            // =====================================================
            // STYLE
            // =====================================================

            "semi": [
                "error",
                "always",
            ],

            "indent": [
                "error",
                4,
                {
                    SwitchCase: 1,
                },
            ],

            "object-curly-spacing": [
                "error",
                "always",
            ],

            "array-bracket-spacing": [
                "error",
                "never"
            ],

            "comma-spacing": [
                "error",
                {
                    before: false,
                    after: true,
                },
            ],

            "space-before-blocks": [
                "error",
            ],

            "keyword-spacing": [
                "error",
            ],

            "space-infix-ops": [
                "error",
            ],

            "eol-last": [
                "error",
                "always",
            ],

            "no-trailing-spaces": [
                "error",
            ],

            "no-multiple-empty-lines": [
                "error",
                {
                    max: 2,
                    maxEOF: 1,
                },
            ],


            // =====================================================
            // OBJECTS / FUNCTIONS
            // =====================================================

            "object-shorthand": [
                "error",
                "always",
            ],

            "func-call-spacing": [
                "error",
                "never",
            ],

            "space-before-function-paren": [
                "error",
                {
                    anonymous: "never",
                    named: "never",
                    asyncArrow: "always",
                },
            ],
        },
    },
];