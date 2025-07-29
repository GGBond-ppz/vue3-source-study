export function patchStyle(el, preValue, nextValue) {
  if (nextValue) {
    // 样式需要比对差异
    for (const key in nextValue) {
      el.style[key] = nextValue[key];
    }

    if (preValue) {
      for (const key in preValue) {
        if (!nextValue[key]) {
          el.style[key] = null;
        }
      }
    }
  } else if (preValue) {
    el.removeAttribute("style");
  }
}
