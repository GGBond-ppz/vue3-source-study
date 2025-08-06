import { recordEffectScope } from "./effectScope";

export let activeEffect = undefined;

export const ITERATE_KEY: unique symbol = Symbol("Object iterate");

function cleanupEffect(effect) {
  const { deps } = effect;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  effect.deps.length = 0;
}

export class ReactiveEffect {
  public deps = []; // 记录effect依赖了哪些属性
  public parent = null; // parent记录外层effect的实例，effect可能会有嵌套
  public active = true; // 这个effect默认是激活状态
  constructor(public fn, public scheduler?) {
    recordEffectScope(this);
  }

  // 执行effect
  run() {
    // 如果是非激活的情况，只需要执行函数，不需要依赖收集
    if (!this.active) {
      return this.fn();
    }
    try {
      // 这里进行依赖收集，核心就是将当前的effect和稍后渲染的属性关联在一起
      // 将当前实例保存，稍后调用取值操作的时候，就可以去到这个全局的activeEffect了
      this.parent = activeEffect;
      activeEffect = this;

      // 这里我们需要在执行用户函数之前将之前收集的内容情况
      // activeEffect.deps = [(Set),(Set)]
      cleanupEffect(this);

      return this.fn();
    } finally {
      activeEffect = this.parent;
    }
  }

  stop() {
    if (this.active) {
      this.active = false;
      cleanupEffect(this); // 停止effect收集
    }
  }
}

export function effect(fn, options: any = {}) {
  // fn可以根据状态变化重新执行，effect可以嵌套

  // 创建响应式effect
  const _effect = new ReactiveEffect(fn, options.scheduler);

  _effect.run(); // 默认先执行一次

  const runner = _effect.run.bind(_effect);

  runner.effect = _effect; // 将effect华仔到runner函数上
  return runner;
}

/**
 * 依赖收集（双向记录）
 * 对象 => 某个属性 => 多个effect
 * WeakMap = {target: Map{name:Set(effect1, effect2)}}
 * @param target 目标对象
 * @param type 类型
 * @param key 对象属性
 */
const targetMap = new WeakMap();
export function track(target, type, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  trackEffects(dep);
}

export function trackEffects(dep) {
  if (activeEffect) {
    let shouldTrack = !dep.has(activeEffect);
    if (shouldTrack) {
      dep.add(activeEffect); // 属性记录effect
      activeEffect.deps.push(dep); // effect记录属性，稍后清理的时候会用到
    }
  }
}

/**
 * 派发更新
 * @param target
 * @param type
 * @param key
 * @param value
 * @param oldValue
 */
export function trigger(target, type, key, value, oldValue) {
  const depsMap = targetMap.get(target);
  // 触发的值不在模板中使用直接返回
  if (!depsMap) return;
  if (type === "add") {
    key = ITERATE_KEY;
  }
  let effects = depsMap.get(key);
  // 永远再执行前，拷贝一份来执行，不要关联引用
  if (effects) {
    triggerEffects(effects);
  }
}

export function triggerEffects(effects) {
  effects = new Set(effects);
  effects &&
    effects.forEach((effect) => {
      // 如果在执行当前effect中又修改了依赖的属性，会无线循环执行当前effect
      // 判断一下如果当前effect重复调用就不执行
      if (effect !== activeEffect) {
        if (effect.scheduler) {
          effect.scheduler();
        } else {
          effect.run();
        }
      }
    });
}
