import { NodeTypes } from "./ast";

// 创建上下文
function createParserContext(template) {
  return {
    line: 1,
    column: 1,
    offset: 0,
    source: template, // 此字段会被不停的解析
    originalSource: template,
  };
}

function isEnd(context) {
  const source = context.source;
  if (source.startsWith("</")) {
    return true;
  }
  return !source;
}

// 根据上下文获取位置信息
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}

// 更新偏移量信息
function advancePositionWithMutation(context, source, endIndex) {
  let linesCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (source.charCodeAt(i) === 10) {
      linesCount++;
      linePos = i;
    }
  }

  context.line += linesCount;
  context.offset += endIndex;
  context.column =
    linePos === -1 ? context.column + endIndex : endIndex - linePos;
}

function advanceBy(context, endIndex) {
  let source = context.source;
  // 每次删掉内容的时候都要更新行列信息
  advancePositionWithMutation(context, source, endIndex);
  context.source = source.slice(endIndex);
}
// 处理文本内容，并且会更新最新的偏移量信息
function parseTextData(context, endIndex) {
  const rawText = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return rawText;
}
// 获取当前开头和结尾的位置信息
function getSelection(context, start, end?) {
  end = end || getCursor(context);

  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

// 文本处理
function parseText(context) {
  // 在解析文本的时候要看到哪里结束
  // abc<div> abc{{}}

  let endTokens = ["<", "{{"];
  let endIndex = context.source.length; // 默认认为到最后结束
  for (let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  // 创建行列信息
  const start = getCursor(context);
  // 取内容
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content: content,
    loc: getSelection(context, start),
  };
}

// 解析表达式
function parseInterpolation(context) {
  const start = getCursor(context); // {{ xxx }}
  // 查找结束的大括号
  const closeIndex = context.source.indexOf("}}", "{{".length);
  advanceBy(context, 2); //   xxx  }}
  const innerStart = getCursor(context);
  const innerEnd = getCursor(context);

  // 拿到原始的内容
  const rawContentLength = closeIndex - 2; // 原始内容的长度
  let preContent = parseTextData(context, rawContentLength); // }} 返回文本内容，并更新信息
  let content = preContent.trim();
  let startOffset = preContent.indexOf(content);
  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, preContent, startOffset);
  }

  let endOffset = startOffset + content.length;
  advancePositionWithMutation(innerEnd, preContent, endOffset);

  advanceBy(context, 2);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd),
    },
    loc: getSelection(context, start),
  };
}

function advanceBySpaces(context) {
  let match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

function parseAttributeValue(context) {
  const start = getCursor(context);
  let quote = context.source[0];
  let content;
  if (quote === '"' || quote === "'") {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  }
  return {
    content,
    loc: getSelection(context, start),
  };
}

function parseAttribute(context) {
  const start = getCursor(context);
  // 属性的名字
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  let name = match[0];
  advanceBy(context, name.length);
  advanceBySpaces(context);
  advanceBy(context, 1);
  let value = parseAttributeValue(context);

  const loc = getSelection(context, start);
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      ...value,
    },
    loc,
  };
}

function parseAttributes(context) {
  const props = [];

  while (context.source.length > 0 && !context.source.startsWith(">")) {
    const prop = parseAttribute(context);
    props.push(prop);
    advanceBySpaces(context);
  }

  return props;
}

function parseTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceBySpaces(context);

  let props = parseAttributes(context);

  let isSelfClosing = context.source.startsWith("/>");
  advanceBy(context, isSelfClosing ? 2 : 1);

  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
    isSelfClosing,
    children: [],
    props,
    loc: getSelection(context, start),
  };
}

// 解析标签
function parseElement(context) {
  // <br/> <div a="1"></div>
  let ele = parseTag(context);

  // 儿子
  let children = parseChildren(context);

  if (context.source.startsWith("</")) {
    parseTag(context);
  }
  ele.loc = getSelection(context, ele.loc.start);
  ele.children = children;
  return ele;
}

export function parse(template) {
  // 创建解析上下文
  const context = createParserContext(template);

  // < 元素
  // {{}} 表达式
  // 其他就是文本
  const start = getCursor(context);
  return createRoot(parseChildren(context), getSelection(context, start));
}

function createRoot(children, loc) {
  return {
    type: NodeTypes.ROOT,
    children,
    loc,
  };
}

function parseChildren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const source = context.source;
    let node;
    if (source.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (source[0] === "<") {
      node = parseElement(context);
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }
  nodes.forEach((node, i) => {
    if (node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      }
    }
  });
  return nodes.filter(Boolean);
}
