const merge = require("webpack-merge");
const common = require("./webpack.common.cjs");

module.exports = merge(common, {
    entry: {
        "ncc.min": "./src/index-wp.js"
    },
    mode: "development",
    devtool: "inline-source-map",
    devServer: {
        contentBase: "./dist",
        hot: true,
        compress: true,
        port: 8080,
        writeToDisk: true
    }
});
