import { ref } from "@my-vue/reactivity";
import { Fragment } from "./vnode";
import { h } from "./h";

export function defineAsyncComponent(options) {
  if (typeof options === "function") {
    options = { loader: options };
  }

  return {
    setup() {
      const loaded = ref(false);
      const error = ref(false);
      const loading = ref(false);
      const {
        loader,
        timeout,
        errorComponent,
        delay,
        loadingComponent,
        onError,
      } = options;
      if (delay) {
        setTimeout(() => {
          loading.value = true;
        }, delay);
      }
      let Comp = null;
      function load() {
        return loader().catch((err) => {
          if (onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(load());
              const fail = () => reject(err);
              onError(err, retry, fail);
            });
          }
        });
      }

      load()
        .then((c) => {
          Comp = c;
          loaded.value = true;
        })
        .finally(() => {
          loading.value = false;
        });
      setTimeout(() => {
        error.value = true;
      }, timeout);
      return () => {
        if (loaded.value) {
          return h(Comp);
        } else if (error.value && errorComponent) {
          console.error(`asyncComponent is timeout ${timeout}`);
          return h(errorComponent);
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent);
        } else {
          h(Fragment, []);
        }
      };
    },
  };
}
