import { CREATE_ELEMENT_VNODE, CREATE_TEXT } from "./runtimeHelpers";

export enum NodeTypes {
  ROOT, // 根节点
  ELEMENT, // 元素
  TEXT, // 文本
  COMMENT, // 注释
  SIMPLE_EXPRESSION, // 简单表达式 a :a="aaa"
  INTERPOLATION, // 模板表达式 {{a}}
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION, // 符合表达式 {{aaa}} bbb
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL, // 文本调用
  // codegen
  VNODE_CALL, // 文本调用
  JS_CALL_EXPRESSION, // js调用表达式
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export function createCallExpression(context, args) {
  let callee = context.helper(CREATE_TEXT);
  return {
    callee,
    type: NodeTypes.JS_CACHE_EXPRESSION,
    arguments: args,
  };
}

export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
  };
}

export function createVNodeCall(
  context,
  vnodeTag,
  propsExpression,
  childrenNode
) {
  context.helper(CREATE_ELEMENT_VNODE);
  return {
    type: NodeTypes.VNODE_CALL,
    tag: vnodeTag,
    props: propsExpression,
    children: childrenNode,
  };
}
