import { isVnode, createVNode } from "./vnode";
import { isArray, isObject } from "@my-vue/shared";

/**
 * h的用法
 * h('div')
 * h('div',{style:{'color': 'red'}})
 * h('div',{style:{'color': 'red'}},'hello')
 * h('div','hello')
 * h('div',null,'hello','world')
 * h('div',null,h('span))
 * h('div',null,[h('span)])
 * h('div',[h('span),h('span)])
 *
 */
export function h(type, propsOrChildren?, children?) {
  const l = arguments.length;
  // h('div','hello')
  // h('div',{style:{'color': 'red'}})
  // h('div',h('span))
  // h('div',[h('span),h('span)])
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]); // 虚拟节点包装成数组
      }
      return createVNode(type, propsOrChildren); // 属性/文本
    } else {
      return createVNode(type, null, propsOrChildren); // 是数组
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    } else if (l === 3 && isVnode(children)) {
      // h('div',{},h('span))
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
