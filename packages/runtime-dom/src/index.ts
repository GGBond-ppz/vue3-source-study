import { createRenderer, h } from "@my-vue/runtime-core";
import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProp";
import { compile } from "@my-vue/compiler-core";

const renderOptions = Object.assign(nodeOps, { patchProp });

export function render(vnode, container) {
  createRenderer(renderOptions).render(vnode, container);
}

export function createApp(component) {
  const app = createRenderer(renderOptions);
  app["mount"] = (container) => {
    container = document.querySelector(container);
    if (component.template) {
      const renderString = compile(component.template);
    }
    render(h(component), container);
  };
  return app;
}

export * from "@my-vue/runtime-core";
