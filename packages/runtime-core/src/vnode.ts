// type props children

import { isArray, isString, ShapeFlags } from "@my-vue/shared";

export function isVnode(value) {
  return !!(value && value.__v_isVnode);
}

// 虚拟节点有很多：组件的、元素的、文本的
export function createVNode(type, props, children = null) {
  // 组合方案 shapeFlag，我想知道一个元素中包含多个儿子还是一个儿子
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;

  // 虚拟dom就是一个对象，diff算法。
  const vnode = {
    type,
    props,
    children,
    el: null, // 虚拟节点上对应的真实节点
    key: props?.["key"],
    __v_isVnode: true,
    shapeFlag,
  };

  if (children) {
    let childType = 0;
    if (isArray(children)) {
      childType = ShapeFlags.ARRAY_CHILDREN;
    } else {
      children = String(children);
      childType = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= childType;
  }

  return vnode;
}
