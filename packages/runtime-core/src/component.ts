import { proxyRefs, reactive } from "@my-vue/reactivity";
import { initProps } from "./componentProps";
import { hasOwn, isFunction, isObject, ShapeFlags } from "@my-vue/shared";
export let currentInstance = null;
export const setCurrentInstance = (instance) => (currentInstance = instance);
export const getCurrentInstance = () => currentInstance;

export function createComponentInstance(vnode, parent) {
  const instance = {
    provides: parent ? parent.provides : Object.create(null),
    parent,
    data: null,
    vnode, // vue2的源码中组件的虚拟节点叫$vnode, 渲染的内容叫_vnode
    subTree: null, // 渲染的组件内容
    isMounted: false,
    update: null,
    propsOptions: vnode.type.props,
    props: {},
    attrs: {},
    proxy: null,
    render: null,
    setupState: {},
    slots: {},
  };

  return instance;
}

const publicPropertyMap = {
  $attrs: (i) => i.attrs,
  $slots: (i) => i.slots,
};

const publicInstanceProxy = {
  get(target, key) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }
    let getter = publicPropertyMap[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (hasOwn(setupState, key)) {
      setupState[key] = value;
    } else if (props && hasOwn(props, key)) {
      console.warn("attempting to mutate prop " + (key as string));
      return false;
    }
    return true;
  },
};

function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  }
}

export function setupComponent(instance) {
  let { props, type, children } = instance.vnode;
  initProps(instance, props);
  initSlots(instance, children);
  instance.proxy = new Proxy(instance, publicInstanceProxy);

  let data = type.data;

  if (data) {
    if (!isFunction(data)) console.warn("data option must be a function");
    instance.data = reactive(data.call(instance.proxy));
  }
  let setup = type.setup;
  if (setup) {
    const setupContext = {
      emit: (event, ...args) => {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        // 找到虚拟节点的属性
        const handler = instance.vnode.props[eventName];
        handler && handler(...args);
      },
      attrs: instance.attrs,
      slots: instance.slots,
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext);
    setCurrentInstance(null);

    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else if (isObject(setupResult)) {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  if (!instance.render) {
    instance.render = type.render;
  }
}
