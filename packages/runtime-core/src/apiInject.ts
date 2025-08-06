import { currentInstance } from "./component";

// provides: parent ? parent.provides : Object.create(null)
export function provide(key, value) {
  // provide一定要用到setup语法中
  if (!currentInstance) return;

  const parentProvide =
    currentInstance.parent && currentInstance.parent.provides;

  // 自己的provides
  let provides = currentInstance.provides;

  // 第一次provides相同，后续使用不进行创建
  debugger;
  if (parentProvide === provides) {
    // 自己的provides不能定义在父亲上，否则导致儿子提供的属性，父亲也能用
    // Object.create(provides) 静态方法以一个现有对象作为原型，创建一个新对象。
    provides = currentInstance.provides = Object.create(provides);
  }

  provides[key] = value;
}

export function inject(key, defaultValue) {
  // inject一定要用到setup语法中
  if (!currentInstance) return;
  const provides = currentInstance.parent && currentInstance.parent.provides;
  // 因为provides是通过Object.create()方法创建，如果父亲找不到会通过原型向上查找
  if (provides && key in provides) {
    return provides[key];
  } else if (arguments.length > 1) {
    return defaultValue;
  }
}
