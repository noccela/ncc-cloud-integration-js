const path = require("path");
const npmPackage = require("./package.json");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
    entry: "./src/index.js",
    output: {
        filename: "main.min.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        library: "NccIntegration",
        globalObject: "this"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                        plugins: [
                            "@babel/plugin-proposal-optional-chaining",
                            "@babel/plugin-proposal-private-methods"
                        ]
                    }
                }
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin([
            {
                from: "static",
                copyUnmodified: true
            }
        ]),
        new webpack.BannerPlugin({
            entryOnly: true,
            banner: () =>
                `${npmPackage.name} ${npmPackage.version}, built ${new Date()}`
        })
    ]
};
