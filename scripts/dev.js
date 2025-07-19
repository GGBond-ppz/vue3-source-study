// nodde scripts/dev.js reactivity -f global
const args = require("minimist")(process.argv.slice(2));
const { build } = require("esbuild");
const { resolve } = require("path");
console.log(args);
// minimist 用来解析命令行参数的
const target = args._[0] || "reactivity";
const format = args._f || "global";

// 开发环境只打包某一个
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

// 输出格式
// iife 立即执行函数 => (function(){})()
// cjs node中的模块 => module.exports
// esm 浏览器中的esModule模块 => import
const outputFormat = format.startsWith("global")
  ? "iife"
  : format === "cjs"
  ? "cjs"
  : "esm";

const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${format}.js`
);

// 天生支持ts
build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.js`)],
  outfile,
  bundle: true, // 把所有包全部打包到一起
  sourcemap: true,
  format: outputFormat, // 输出格式
  globalName: pkg.buildOptions?.name, // 打包的全局的名字
  platform: outputFormat === "cjs" ? "node" : "browser", // 平台
  watch: {
    // 监控文件变化
    onRebuild(error) {
      if (!error) {
        console.log("rebuild~~~~~");
      } else {
        console.error("error", error);
      }
    },
  },
}).then(() => {
  console.log("watching~~~~");
});
