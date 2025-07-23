import { ShapeFlags } from "@my-vue/shared";

export function createRenderer(renderOptions) {
  let {
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    createElement: hostCreateElement,
    createText: hostCreateText,
    patchProp: hostPatchProp,
  } = renderOptions;

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const vnode = children[i];
      patch(null, vnode, container);
    }
  };

  const mountElement = (vnode, container) => {
    let { type, props, children, shapeFlag } = vnode;
    // 将真实元素挂载到虚拟节点上，用于后续复用节点比对
    let el = (vnode.el = hostCreateElement(type));

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }
    hostInsert(el, container);
  };

  // 核心patch方法
  const patch = (n1, n2, container) => {
    // TODO n2可能是个字符串
    if (n1 === n2) return;
    if (n1 === null) {
      // 初次渲染
      mountElement(n2, container);
    } else {
      // 更新流程
    }
  };

  const render = (vnode, container) => {
    if (vnode === null) {
      // 卸载逻辑
    } else {
      // 这里既有初始化逻辑，也有更新的逻辑
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return { render };
}
