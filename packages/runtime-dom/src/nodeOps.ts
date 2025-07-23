export const nodeOps = {
  // 增加 删除 修改 查询
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor); // anchor=null时 insertBefore = appendChild
  },
  remove(child) {
    const parentNode = child.parentNode;
    if (parentNode) {
      parentNode.removeChild(child);
    }
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  // document.createTextNode()
  setText(node, text) {
    node.nodeValue = text;
  },

  querySelecctor(selector) {
    return document.querySelector(selector);
  },
  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  createElement(tagName) {
    return document.createElement(tagName);
  },
  createText(text) {
    return document.createTextNode(text);
  },
};
