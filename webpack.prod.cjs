const { merge } = require("webpack-merge");
const common = require("./webpack.common.cjs");

module.exports = merge(common, {
    mode: "production",
    entry: {
        "ncc.min": "./src/index-wp.js"
    }
});
