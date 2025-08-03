import { isFunction } from "@my-vue/shared";
import { ReactiveEffect } from "./effect";

export function watchEffect(cb, options: any = {}) {
  if (!isFunction(cb)) {
    console.warn("watchEffect param is must be a function");
    return;
  }
  const effect = new ReactiveEffect(cb);
  effect.run();
}
