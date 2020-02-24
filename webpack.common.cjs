const path = require("path");
const npmPackage = require("./package.json");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
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
                // Minify only the minified module.
                extractComments: false,
                terserOptions: {
                    compress: true,
                    mangle: true,
                    output: {
                        // Preserve only banner.
                        comments: /@noccela/
                    }
                }
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
    ],
    externals: {
        // Node users should import this explicitly.
        ws: "ws"
    }
};
