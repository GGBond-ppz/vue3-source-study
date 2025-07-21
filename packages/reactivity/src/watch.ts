import { isFunction, isObject } from "@my-vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive, reactive } from "./reactive";

/**
 * 遍历，需要考虑对象是否有循环引用
 * @param value 遍历的对象
 * @param set 处理循环引用问题
 */
function traversal(value, set = new Set()) {
  if (!isObject(value)) return value;

  if (set.has(value)) return value;

  set.add(value);
  for (const key in value) {
    traversal(value[key], set);
  }
  return value;
}

/**
 * Vue3中watch实现
 * @param source 用户传入的源代码（对象/函数）
 * @param cb
 */
export function watch(source, cb, options: any = {}) {
  let getter;
  if (isReactive(source)) {
    // 对我们用户传入的数据递归循环，获取属性触发get()方法进行effect依赖收集
    getter = () => traversal(source);
  } else if (isFunction(source)) {
    if (!isObject(source())) {
      getter = source;
    } else {
      if (options.deep) {
        getter = () => traversal(source());
      } else {
        getter = source;
      }
    }
  }

  let cleanup;
  const onCleanup = (fn) => {
    cleanup = fn;
  };

  let oldValue;

  const job = () => {
    const newValue = effect.run();
    if (cleanup) cleanup(); // 下一次watch执行前触发上一次的cleanup()
    cb(newValue, oldValue, onCleanup);
    oldValue = newValue;
  };
  // 监控用户的函数执行，变化后重新执行job
  const effect = new ReactiveEffect(getter, job);

  // 先执行一次用户的getter函数收集依赖
  oldValue = effect.run();
}
