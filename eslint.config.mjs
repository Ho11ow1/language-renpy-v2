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
                "warn",
                {
                    allowExpressions: false,
                    allowTypedFunctionExpressions: false,
                    allowHigherOrderFunctions: false,
                    allowDirectConstAssertionInArrowFunctions: false,
                },
            ],

            // =====================================================
            // TYPESCRIPT SAFETY
            // =====================================================
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],

            "@typescript-eslint/no-explicit-any": [
                "warn",
            ],

            // =====================================================
            // GENERAL JAVASCRIPT SAFETY
            // =====================================================
            "no-unreachable": "error",
            "no-duplicate-imports": "warn",
            "no-useless-return": "warn",

            // =====================================================
            // STYLE
            // =====================================================

            "semi": [
                "warn",
                "always",
            ],

            "quotes": [
                "warn",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true,
                },
            ],

            "indent": [
                "warn",
                4,
                {
                    SwitchCase: 1,
                },
            ],

            "object-curly-spacing": [
                "warn",
                "always",
            ],

            "array-bracket-spacing": [
                "warn",
                "never",
            ],

            "comma-spacing": [
                "warn",
                {
                    before: false,
                    after: true,
                },
            ],

            "space-before-blocks": [
                "warn",
            ],

            "keyword-spacing": [
                "warn",
            ],

            "space-infix-ops": [
                "warn",
            ],

            "eol-last": [
                "warn",
                "always",
            ],

            "no-trailing-spaces": [
                "warn",
            ],

            "no-multiple-empty-lines": [
                "warn",
                {
                    max: 2,
                    maxEOF: 1,
                },
            ],


            // =====================================================
            // OBJECTS / FUNCTIONS
            // =====================================================

            "object-shorthand": [
                "warn",
                "always",
            ],

            "func-call-spacing": [
                "warn",
                "never",
            ],

            "space-before-function-paren": [
                "warn",
                {
                    anonymous: "never",
                    named: "never",
                    asyncArrow: "always",
                },
            ],
        },
    },
];