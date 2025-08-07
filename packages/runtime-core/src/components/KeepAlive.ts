import { ShapeFlags } from "@my-vue/shared";
import { getCurrentInstance } from "../component";
import { isVnode } from "../vnode";
import { onMounted, onUpdated } from "../apiLifecycle";

function resetShapeFlag(vnode) {
  let shapeFlag = vnode.shapeFlag;
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
  }
  if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
  }
  vnode.shapeFlag = shapeFlag;
}

export const KeepAliveImpl = {
  __isKeepAlive: true,
  props: {
    include: {}, // 需要缓存的组件
    exclude: {}, // 不需要缓存的组件
    max: {}, // 最大缓存个数
  },
  setup(props, { slots }) {
    const keys = new Set(); // 缓存的key
    const cache = new Map(); // key-虚拟节点 映射表

    const instance = getCurrentInstance();
    const { createElement, move } = instance.ctx.renderer;
    const storageContainer = createElement("div"); // 稍后要把缓存的组件移入进去

    instance.ctx.deactivate = function (vnode) {
      move(vnode, storageContainer);
      // deactivate()
    };

    instance.ctx.activate = function (vnode, container, anchor) {
      move(vnode, container, anchor);
      // activate()
    };

    let pendingCacheKey = null;

    function cacheSubTree() {
      if (pendingCacheKey) {
        cache.set(pendingCacheKey, instance.subTree);
      }
    }

    onMounted(cacheSubTree);

    onUpdated(cacheSubTree);

    const { include, exclude, max } = props;
    let current = null;
    function pruneCacheEntry(key) {
      resetShapeFlag(current);
      cache.delete(key);
      keys.delete(key);
    }

    return () => {
      // keep-alive默认会取slots的default属性，返回虚拟节点的第一个
      let vnode = slots.default();
      if (
        !isVnode(vnode) ||
        !(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)
      ) {
        return vnode;
      }

      const comp = vnode.type;
      const key = vnode.key == null ? comp : vnode.key;

      let name = comp.name; // 组件的名字，可以根据组件的名字来决定是否需要缓存
      if (
        (name && include && !include.split(",").includes(name)) ||
        (exclude && exclude.split(",").includes(name))
      ) {
        return vnode;
      }

      let cacheVnode = cache.get(key);
      if (cacheVnode) {
        vnode.component = cacheVnode.component;
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
        keys.delete(key);
        keys.add(key);
      } else {
        keys.add(key); // 缓存key
        pendingCacheKey = key;
        if (max && key.size > max) {
          pruneCacheEntry(keys.values().next().value);
        }
      }
      // 标识组件是keepAlive，不需要真卸载
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      current = vnode;
      return vnode;
    };
  },
};

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
