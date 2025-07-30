import { reactive } from "@my-vue/reactivity";
import { hasOwn } from "@my-vue/shared";

export function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};

  const options = instance.propsOptions || {};
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key];
      if (hasOwn(options, key)) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }

    /**
     * 这里props不希望再组件内部被更改，但是props得是响应式的
     *  因为后续属性变化了要更新视图，源码使用的是shallowReactive
     */
    instance.props = reactive(props);
    instance.attrs = attrs;
  }
}

export const hasPropsChanged = (prevProps = {}, nextProps = {}) => {
  const nextKeys = Object.keys(nextProps);
  const prevKeys = Object.keys(prevProps);

  if (nextKeys.length !== prevKeys.length) {
    return true;
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }

  return false;
};

export function updateProps(prevProps, nextProps) {
  // 看一下属性是否有变化

  // 值的变化，个数的变化
  if (hasPropsChanged(prevProps, nextProps)) {
    for (const key in nextProps) {
      prevProps[key] = nextProps[key];
    }

    for (const key in prevProps) {
      if (!hasOwn(nextProps, key)) {
        delete prevProps[key];
      }
    }
  }
}
