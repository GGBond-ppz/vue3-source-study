export function patchAttr(el, key, nextValue) {
  if (nextValue) {
    el.setAttritube(key, nextValue);
  } else {
    el.removeAttritube(key);
  }
}
