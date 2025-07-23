function createInvoker(callback) {
  const invoker = (e) => invoker.value(e);
  invoker.value = callback;
  return invoker;
}

export function patchEvent(el, eventName, nextValue) {
  // 优化前：移出之前的事件，绑定新的事件
  // 优化后：绑定自定义事件，改变内部调用的事件
  let invokers = el._vei || (el._vei = {});

  let exits = invokers[eventName];

  if (exits && nextValue) {
    // 已经绑定过事件
    exits.value = nextValue;
  } else {
    // onClick => click
    let event = eventName.slice(2).toLowerCase();

    if (nextValue) {
      const invoker = (invokers[eventName] = createInvoker(nextValue));
      el.addEventListener(event, invoker);
    } else if (exits) {
      el.removeEventListener(event, exits);
      invokers[eventName] = undefined;
    }
  }
}
