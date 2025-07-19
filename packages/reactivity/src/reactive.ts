import { isObject } from "@my-vue/shared";
import { mutableHandler, ReactiveFlags } from "./baseHandler";

// 将数据转换成响应式数据，只能做对象的代理
const reactiveMap = new WeakMap(); // key只能是对象

export function reactive(target) {
  if (!isObject(target)) {
    return;
  }

  /**
   * 判断target是否是一个代理对象
   * 如果是代理对象就会有get()，将ReactiveFlags.IS_REACTIVE作为key传入，会返回true
   */
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  // 判断对象是否有重复代理
  let existingProxy = reactiveMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  /**
   * vue3响应式原理，代理对象
   */
  const proxy = new Proxy(target, mutableHandler);
  reactiveMap.set(target, proxy);
  return proxy;
}
