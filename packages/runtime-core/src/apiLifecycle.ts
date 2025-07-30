import { currentInstance, setCurrentInstance } from "./component";

export const enum LifecycleHooks {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

function createHook(type) {
  // hook需要绑定到对应的实例上
  return (hook, target = currentInstance) => {
    // 关联当前实例和hook
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrappedHook = () => {
        setCurrentInstance(target);
        hook();
        setCurrentInstance(null);
      };
      hooks.push(wrappedHook);
    }
  };
}

// 工厂模式
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
