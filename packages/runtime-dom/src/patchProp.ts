import { patchAttr } from "./modules/attr";
import { patchClass } from "./modules/class";
import { patchEvent } from "./modules/event";
import { patchStyle } from "./modules/style";

export function patchProp(el, key, preValue, nextValue) {
  // 类名 el.className
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    // 样式 el.style
    patchStyle(el, preValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    // events addEventListener
    patchEvent(el, key, nextValue);
  } else {
    patchAttr(el, key, nextValue);
  }

  // 普通属性 el.setAttribute
}
