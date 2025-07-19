import { track, trigger } from "./effect";

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
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    // 值变化了
    if (oldValue !== value) {
      // 派发更新
      trigger(target, "set", key, value, oldValue);
    }

    return result;
  },
};
