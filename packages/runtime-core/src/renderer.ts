import { isString, ShapeFlags } from "@my-vue/shared";
import { createVNode, Fragment, isSameVnode, Text } from "./vnode";
import { getSequence } from "./sequence";

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

  const normalize = (children, i) => {
    if (isString(children[i])) {
      let vnode = createVNode(Text, null, children[i]);
      children[i] = vnode;
    }
    return children[i];
  };

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      let child = normalize(children, i);
      patch(null, child, container);
    }
  };

  const mountElement = (vnode, container, anchor) => {
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
    hostInsert(el, container, anchor);
  };

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      // 跟新文本
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  const patchProps = (oldProps, newProps, el) => {
    for (const key in newProps) {
      if (key === "style") {
        hostPatchProp(el, key, oldProps[key], newProps[key]);
      }
    }

    for (const key in oldProps) {
      if (!newProps[key]) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };

  // diff算法核心
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // sync from start 头头比对
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }

    // sync from end 尾尾比对
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // common sequence + mount 同序列挂载
    // i要比e1大说明有新增的
    // i和e2之间的是新增的部分
    if (i > e1) {
      if (i <= e2) {
        while (i <= e2) {
          const nextPos = e2 + 1;
          const anchor = nextPos < c2.length ? c2[nextPos].el : null;
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // common sequence + unmount 同序列卸载
      // i要比e2大说明有需要删除的
      // i和e1之间的是删除的部分
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i]);
          i++;
        }
      }
    }

    // 乱序比对
    // 使用新的元素创建映射表
    let s1 = i;
    let s2 = i;
    const keyToNewIndexMap = new Map();
    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i);
    }

    // 循环旧元素，判断是否在映射表内能找到，有则比较差异，没有就插入，多出来的要删除
    const toBePatched = e2 - s2 + 1; // 新元素的总个数
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 记录是否比对过的映射表 0表示没有比对过
    for (let i = s1; i <= e1; i++) {
      const oldChild = c1[i];
      let newIndex = keyToNewIndexMap.get(oldChild.key);
      if (!newIndex) {
        unmount(oldChild);
      } else {
        // 新的位置对应老的位置，0表示没有比对过，如果数组内的值>0说明已经patch过了
        newIndexToOldIndexMap[newIndex - s2] = i + 1;
        patch(oldChild, c2[newIndex], el);
      }
    }

    // 获取最长递增子序列
    let increment = getSequence(newIndexToOldIndexMap);

    // 到这里新老属性和儿子比对，没有移动位置
    // 下面开始移动位置
    let j = increment.length - 1;
    for (let i = toBePatched - 1; i >= 0; i--) {
      let index = i + s2;
      let current = c2[index];
      let anchor = index + 1 < c2.length ? c2[index + 1].el : null;
      if (newIndexToOldIndexMap[i] === 0) {
        patch(null, current, el, anchor);
      } else {
        if (i != increment[j]) {
          hostInsert(current.el, el, anchor);
        } else {
          j--;
        }
      }
    }
  };

  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag; // 旧的
    const shapeFlag = n2.shapeFlag; // 新的

    // 新   旧
    // 1)文本 数组 （删除旧节点，设置文本内容）
    // 2)文本 文本/空 （更新文本）
    // 3)数组 数组 （diff算法）
    // 4)数组 文本 （清空文本，进行挂载）
    // 5)空   数组 （删除旧节点）
    // 6)空   文本 （清空文本）
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 1)文本 数组 （删除旧节点，设置文本内容）
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        // 2)文本 文本/空 （更新文本）
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 3)数组 数组 （diff算法）
          patchKeyedChildren(c1, c2, el); // 全量比对
        } else {
          // 5)空   数组 （删除旧节点）
          unmountChildren(c1);
        }
      } else {
        // 4)数组 文本 （清空文本，进行挂载）
        // 6)空   文本 （清空文本）
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
    }
  };
  const patchElement = (n1, n2) => {
    // 先复用节点，再比较属性，在比较儿子
    let el = (n2.el = n1.el);
    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    // 比较属性
    patchProps(oldProps, newProps, el);

    // 比较儿子
    patchChildren(n1, n2, el);
  };

  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) {
      // 初次渲染
      mountElement(n2, container, anchor);
    } else {
      // 更新元素
      patchElement(n1, n2);
    }
  };

  const processFragment = (n1, n2, container) => {
    if (!n1) {
      mountChildren(n2.children, container);
    } else {
      patchChildren(n1, n2, container);
    }
  };

  // 核心patch方法
  const patch = (n1, n2, container, anchor = null) => {
    // TODO n2可能是个字符串
    if (n1 === n2) return;

    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1); // 删除老的
      n1 = null;
    }

    const { type, shapeFlag } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment: // 无用的标签
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag && ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        }
    }
  };

  const unmount = (vnode) => {
    hostRemove(vnode.el);
  };

  const render = (vnode, container) => {
    if (vnode === null) {
      // 卸载
      // 之前确实渲染过了，执行卸载逻辑
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 这里既有初始化逻辑，也有更新的逻辑
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return { render };
}
