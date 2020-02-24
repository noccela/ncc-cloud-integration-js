const merge = require("webpack-merge");
const common = require("./webpack.common.cjs");

module.exports = merge(common, {
    mode: "production",
    target: "node",
    entry: {
        "ncc.node.min": "./src/index-wp.js"
    }
});
