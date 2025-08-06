import {
  invokeArrayFns,
  isNumber,
  isString,
  PatchFlags,
  ShapeFlags,
} from "@my-vue/shared";
import { createVNode, Fragment, isSameVnode, Text } from "./vnode";
import { getSequence } from "./sequence";
import { ReactiveEffect } from "@my-vue/reactivity";
import { queueJob } from "./scheduler";
import { hasPropsChanged, updateProps } from "./componentProps";
import { createComponentInstance, setupComponent } from "./component";

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

  // 标准化
  const normalize = (children, i) => {
    if (isString(children[i]) || isNumber(children[i])) {
      let vnode = createVNode(Text, null, children[i]);
      children[i] = vnode;
    }
    return children[i];
  };

  // 挂载子节点
  const mountChildren = (children, container, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      let child = normalize(children, i);
      patch(null, child, container, parentComponent);
    }
  };

  // 挂载元素
  const mountElement = (vnode, container, anchor, parentComponent) => {
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
      mountChildren(children, el, parentComponent);
    }
    hostInsert(el, container, anchor);
  };

  // 处理文本
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

  // 比较参数
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

  // 卸载子节点
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

  // 比较子节点
  const patchChildren = (n1, n2, el, parentComponent) => {
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
          mountChildren(c2, el, parentComponent);
        }
      }
    }
  };

  const patchBlockChildren = (n1, n2, parentComponent) => {
    for (let i = 0; i < n2.dynamicChildren.length; i++) {
      patchElement(
        n1.dynamicChildren[i],
        n2.dynamicChildren[i],
        parentComponent
      );
    }
  };

  // 元素的比较
  const patchElement = (n1, n2, parentComponent) => {
    // 先复用节点，再比较属性，在比较儿子
    let el = (n2.el = n1.el);
    let oldProps = n1.props || {};
    let newProps = n2.props || {};
    for (let i = 0; i < n2.children.length; i++) {
      normalize(n2.children, i);
    }

    let { patchFlag } = n2;
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        hostPatchProp(el, "class", null, newProps.class);
      }
    } else {
      // 比较属性
      patchProps(oldProps, newProps, el);
    }

    // 比较儿子
    if (n2.dynamicChildren) {
      // 靶向更新
      patchBlockChildren(n1, n2, parentComponent);
    } else {
      // 全量比较
      patchChildren(n1, n2, el, parentComponent);
    }
  };

  // 处理元素类型
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      // 初次渲染
      mountElement(n2, container, anchor, parentComponent);
    } else {
      // 更新元素
      patchElement(n1, n2, parentComponent);
    }
  };

  // 处理Fragment类型
  const processFragment = (n1, n2, container, parentComponent) => {
    if (n1 == null) {
      mountChildren(n2.children, container, parentComponent);
    } else {
      patchChildren(n1, n2, container, parentComponent);
    }
  };

  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next;
    updateProps(instance.props, next.props);
    debugger;
  };

  // 挂载组件Effect
  const setupRenderEffect = (instance, container, anchor) => {
    const { render } = instance;
    const componentUpdateFn = () => {
      // 区分是初始化还是更新
      if (!instance.isMounted) {
        // 初始化
        let { bm, m } = instance;
        if (bm) {
          invokeArrayFns(bm);
        }
        const subTree = render.call(instance.proxy, instance.proxy);
        patch(null, subTree, container, anchor, instance); // 创建了subTree的真实节点并插入
        if (m) {
          invokeArrayFns(m);
        }
        instance.subTree = subTree;
        instance.isMounted = true;
      } else {
        // 组件内部更新
        let { next, bu, u } = instance;
        if (bu) {
          invokeArrayFns(bu);
        }
        if (next) {
          // 更新前拿到最新的属性来进行更新
          updateComponentPreRender(instance, next);
        }
        const subTree = render.call(instance.proxy, instance.proxy);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArrayFns(u);
        }
      }
    };

    const effect = new ReactiveEffect(componentUpdateFn, () =>
      queueJob(instance.update)
    );

    let update = (instance.update = effect.run.bind(effect)); // 调用effect.run可以让组件强制重新渲染
    update();
  };

  // 组件挂载
  const mountComponent = (vnode, container, anchor, parentComponent) => {
    // 1. 创建一个组件实例
    let instance = (vnode.component = createComponentInstance(
      vnode,
      parentComponent
    ));
    // 2. 初始化组件
    setupComponent(instance);
    // 3. 创建effect
    setupRenderEffect(instance, container, anchor);
  };

  const shouldUpdateComponent = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    if (prevProps === nextProps) return false;

    if (prevChildren || nextChildren) {
      return true;
    }

    return hasPropsChanged(prevProps, nextProps);
  };

  // 组件更新
  const updateComponent = (n1, n2) => {
    // 对于元素来说复用的是dom节点，对于组件复用的是组件实例
    const instance = (n2.component = n1.component);

    // 需要更新就强制调用组件的update方法
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2; // 将新的虚拟节点放到next属性上
      instance.update();
    }
    // updateProps(instance, prevProps, nextProps);
  };

  // 统一处理组件
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      updateComponent(n1, n2);
    }
  };

  // 核心patch方法
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 == n2) return;

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
        processFragment(n1, n2, container, parentComponent);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          type.process(n1, n2, container, anchor, {
            mountChildren,
            patchChildren,
            move(vnode, container) {
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container
              );
            },
          });
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
