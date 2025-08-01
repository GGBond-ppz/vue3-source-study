import { parse } from "./parse";
import { transform } from "./transform";

export function compile(template) {
  // 编译原理，将html语法转换为js语法
  // 1. 将模板转换为抽象语法树
  const ast = parse(template);
  // 2. 对ast语法树进行一些预先处理
  // 这里转化，要进行收集所需的方法 createElementVnode toDisplayString...
  // codegen 为了生成代码的时候更方便，在转化过程中会生成这样一个属性
  transform(ast);

  return ast;
  // // 生成代码
  // return generate(ast)
}
