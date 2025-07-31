import { parse } from "./parse";

export function compile(template) {
  // 编译原理，将html语法转换为js语法
  // 1. 将模板转换为抽象语法树
  const ast = parse(template);
  return ast;
  // 2. 对ast语法树进行一些预先处理
  // transform(ast)

  // // 生成代码
  // return generate(ast)
}
