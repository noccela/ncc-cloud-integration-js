const path = require("path");
const npmPackage = require("./package.json");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: {
        // "main": "./src/index.js",
        "ncc.min": "./src/index-wp.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        library: "NccIntegration",
        globalObject: "this"
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                include: /ncc\.js$/,
                extractComments: false,
                terserOptions: {
                    mangle: true,
                    output: {
                        // Preserve only JSDoc comments.
                        comments: "some"
                    }
                }
            }),
            new TerserPlugin({
                // Minify only the minified module.
                include: /ncc\.min\.js$/,
                extractComments: false
            })
        ]
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    // Use common babel config.
                    options: require("./babel.config.cjs")
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