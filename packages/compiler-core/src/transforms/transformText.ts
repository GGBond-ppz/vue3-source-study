import { Text } from "./../../../runtime-core/src/vnode";
import { createCallExpression, NodeTypes } from "../ast";
import { PatchFlags } from "@my-vue/shared";

export function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}

export function transformText(node, context) {
  // 需要需要元素的时候才能处理多个子节点
  if (node.type === NodeTypes.ELEMENT || node.type === NodeTypes.ROOT) {
    return () => {
      // {{aaa}} abc => 组合表达式 COMPOUND_EXPRESSION
      // ast语法树中是两个节点，需要组合到一起成为一个文本节点
      // 查找连续的表达式和文本将它们拼接
      let currentContainer = null;
      let children = node.children;
      let hasText = false;
      for (let i = 0; i < children.length; i++) {
        const child = children[i]; // 拿到第一个孩子
        hasText = true;
        if (isText(child)) {
          // 看下一个节点是不是文本
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }
              currentContainer.children.push(`+`, next);
              children.splice(j, 1);
              j--;
            } else {
              currentContainer = null;
              break;
            }
          }
        }
      }
      // 如果只有一个节点，则直接插入元素
      if (hasText && children.length === 1) {
        return;
      }

      // 需要给多个儿子中创建文本节点添加 patchFlag
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const callArgs = [];
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          callArgs.push(child);
          if (node.type !== NodeTypes.TEXT) {
            // 动态节点
            callArgs.push(PatchFlags.TEXT);
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL, // 通过createTextVnode来实现
            content: child,
            codegenNode: createCallExpression(context, callArgs),
          };
        }
      }
      // 元素里有一个文本{{aa}} 标识位（patchFlag）应该是一个文本
    };
  }
}
