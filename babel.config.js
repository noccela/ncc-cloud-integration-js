// Separate Babel config is required for Jest to use imports.
module.exports = {
    presets: ["@babel/preset-env"],
    plugins: [
        "@babel/plugin-proposal-optional-chaining",
        "@babel/plugin-proposal-private-methods",
        "@babel/plugin-syntax-dynamic-import"
    ]
};
