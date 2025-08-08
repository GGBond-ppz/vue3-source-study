import { hasOwn, isObject } from "@my-vue/shared";
import { ITERATE_KEY, track, trigger } from "./effect";
import { reactive } from "./reactive";
import { isRef } from "./ref";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}
export const mutableHandler = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    // 依赖收集
    track(target, "get", key);
    /**
     * 使用Reflect.get(target, propertyKey, receiver)
     * target需要取值的目标对象
     * propertyKey需要获取的值的键值
     * receiver如果target对象中指定了getter，receiver则为getter调用时的this值。
     * 目的：对象中使用get属性选择器返回对象中的属性this.xx，需要将对象的this指向改为代理对象
     */
    let res = Reflect.get(target, key, isRef(target) ? target : receiver);

    if (isRef(res)) {
      // ref unwrapping - skip unwrap for Array + integer key.
      return res.value;
    }

    if (isObject(res)) {
      return reactive(res); // 深度代理实现，取值的时候才会代理，性能好
    }
    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    const hasKey = hasOwn(target, key);
    debugger;
    let result = Reflect.set(
      target,
      key,
      value,
      isRef(target) ? target : receiver
    );
    // 值变化了
    if (oldValue !== value) {
      // 派发更新
      if (!hasKey) {
        trigger(target, "add", key, value, oldValue);
      } else {
        trigger(target, "set", key, value, oldValue);
      }
    }

    return result;
  },
  ownKeys(target) {
    track(target, "iterate", ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};
