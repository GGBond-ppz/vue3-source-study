// type props children

import { isTeleport } from "./components/Teleport";
import { isArray, isObject, isString, ShapeFlags } from "@my-vue/shared";
export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");
export function isVnode(value) {
  return !!(value && value.__v_isVnode);
}

// 判断两个虚拟节点是否是相同节点
// 规则：1.标签名是否一致 2.key是否一致
export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

// 虚拟节点有很多：组件的、元素的、文本的
export function createVNode(type, props, children = null, patchFlag = 0) {
  // 组合方案 shapeFlag，我想知道一个元素中包含多个儿子还是一个儿子
  let shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;

  // 虚拟dom就是一个对象，diff算法。
  const vnode = {
    type,
    props,
    children,
    el: null, // 虚拟节点上对应的真实节点
    key: props?.["key"],
    __v_isVnode: true,
    shapeFlag,
    patchFlag,
  };

  if (children) {
    let childType = 0;
    if (isArray(children)) {
      childType = ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
      childType = ShapeFlags.SLOTS_CHILDREN;
    } else {
      children = String(children);
      childType = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= childType;
  }

  if (currentBlock && vnode.patchFlag > 0) {
    currentBlock.push(vnode);
  }

  return vnode;
}
export { createVNode as createElementVNode };
let currentBlock = null;
export function openBlock() {
  currentBlock = [];
}

export function createElementBlock(type, props, children, patchFlag) {
  return setupBlock(createVNode(type, props, children, patchFlag));
}

function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  currentBlock = null;
  return vnode;
}

export function toDisplayString(val) {
  return isString(val)
    ? val
    : val == null
    ? ""
    : isObject(val)
    ? JSON.stringify(val)
    : String(val);
}
