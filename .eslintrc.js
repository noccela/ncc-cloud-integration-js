module.exports = {
    env: {
        browser: true,
        es6: true
    },
    extends: "eslint:recommended",
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly"
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module"
    },
    parser: "@typescript-eslint/parser",
    rules: {
        semi: ["error", "always"],
        quotes: ["error", "double"]
    },
    ignorePatterns: [
        "node_modules/",
        "webpack.*",
        "dist/",
        "*.test.js",
        "babel.config.cjs",
        "*.config.js"
    ]
};
