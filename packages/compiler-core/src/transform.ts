import { createVNodeCall, NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  FRAGMENT,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

function createTransformContext(root) {
  const context = {
    currentNode: root, // 当前正在转化的节点
    parent: null, // 当前转化的父节点
    helpers: new Map(), // 优化，超过20个相同的节点会被字符串化
    helper(name) {
      // 根据使用过的方法进行优化
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    },
    removeHelper(name) {
      const count = context.helpers.get(name);
      if (count) {
        const currentCount = count - 1;
        if (!currentCount) {
          context.helpers.delete(name);
        } else {
          context.helpers.set(name, currentCount);
        }
      }
    },
    nodeTransforms: [transformElement, transformText, transformExpression],
  };
  return context;
}

function traverse(node, context) {
  context.currentNode = node;
  const transforms = context.nodeTransforms;
  const exitsFns = [];
  for (let i = 0; i < transforms.length; i++) {
    let onExit = transforms[i](node, context); // 在执行的时候，有可能被删除了
    if (onExit) exitsFns.push(onExit);
    if (!context.currentNode) return; // 如果当前节点被删除了，就不考虑儿子
  }
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 宏 常量
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverse(node.children[i], context);
      }
  }
  // 当执行退出函数的时候保证currentNode的指向是对的
  context.currentNode = node;
  let i = exitsFns.length;
  while (i--) {
    exitsFns[i]();
  }
}

function createRootCodegen(ast, context) {
  let { children } = ast;

  if (children.length === 1) {
    const child = children[0];
    // 元素
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      ast.codegenNode = child.codegenNode;
      // 调用 openBlock createElementBlock
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(OPEN_BLOCK);
      context.helper(CREATE_ELEMENT_BLOCK);
      ast.codegenNode.isBlock = true; // 只有一个元素，当前元素是block节点，并且使用的是createElementBlock
    } else {
      ast.codegenNode = child;
    }
  } else {
    if (children.length === 0) return;
    ast.codegenNode = createVNodeCall(
      context,
      context.helper(FRAGMENT),
      null,
      children
    );
    context.helper(OPEN_BLOCK);
    context.helper(CREATE_ELEMENT_BLOCK);
    ast.codegenNode.isBlock = true;
  }
}

export function transform(ast) {
  const context = createTransformContext(ast);
  traverse(ast, context);
  createRootCodegen(ast, context);
  ast.helpers = [...context.helpers.keys()];
}
