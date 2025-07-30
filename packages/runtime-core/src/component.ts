import { proxyRefs, reactive } from "@my-vue/reactivity";
import { initProps } from "./componentProps";
import { hasOwn, isFunction, isObject } from "@my-vue/shared";

export function createComponentInstance(vnode) {
  const instance = {
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
  };

  return instance;
}

const publicPropertyMap = {
  $attrs: (i) => i.attrs,
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

export function setupComponent(instance) {
  let { props, type } = instance.vnode;
  initProps(instance, props);
  instance.proxy = new Proxy(instance, publicInstanceProxy);

  let data = type.data;

  if (data) {
    if (!isFunction(data)) console.warn("data option must be a function");
    instance.data = reactive(data.call(instance.proxy));
  }
  let setup = type.setup;
  if (setup) {
    const setupContext = {};
    const setupResult = setup(instance.props, setupContext);

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
