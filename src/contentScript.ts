import { Readability, isProbablyReaderable } from "@mozilla/readability";

setTimeout(() => {
  (window as any).parse = parse;
  parse();
}, 3000);

function parse() {
  console.time("parse");
  const documentClone = window.document.cloneNode(true) as any;
  const reader = new Readability(documentClone, {
    charThreshold: 3000
  });
  const article = reader.parse();

  const parser = new DOMParser();
  const htmlString = article.content;
  const doc = parser.parseFromString(htmlString, 'text/html');
  //现在已有个跟节点，我现在想要找到第一个文本长度大于10的文本节点，以及这个节点到跟节点的深度。请写出这样的一个js 函数
  //遍历doc节点树
  const treeWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  let node = treeWalker.nextNode();
  let textNode = null;
  let depth = 0;
  while (node) {
    if (node.textContent.trim().length > 30) {
      textNode = node;
      break;
    }
    node = treeWalker.nextNode();
  }
  //找到了textNode
  if (textNode) {
    let parent = textNode.parentNode;
    depth++;
    while (parent && parent != doc.body) {
      depth++;
      parent = parent.parentNode;
    }
  }

  if (!textNode) {
    console.log("找不到文本节点");
    return;
  }

  // depth -= 1;
  console.log("htmlString", htmlString, "textNode", textNode, "depth", depth);
  //然后根据这个textNode 在document body找到相同文本的节点。然后再根据这个深度反向找到对应的根节点
  const bodyTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let bodyNode = bodyTreeWalker.nextNode();
  let bodyTextNode = null;
  while (bodyNode) {
    if (bodyNode.textContent === textNode?.textContent) {
      bodyTextNode = bodyNode;
      break;
    }
    bodyNode = bodyTreeWalker.nextNode();
  }

  let contentRoot;
  //找到了bodyTextNode
  if (bodyTextNode) {
    depth--;
    let parent = bodyTextNode.parentNode;
    while (depth > 0) {
      depth--;
      parent = parent.parentNode;
    }
    console.log("root", isProbablyReaderable(document, { minContentLength: 2000 }), parent);

    if (parent == document) {
      console.log("*****失败");
    }
    contentRoot = parent;
  }

  console.timeEnd("parse");

  if (contentRoot && isProbablyReaderable(document, {
    minContentLength: 2000
  })) {
    // analyzeTextParentNodes(contentRoot);
    const articleNode = findAritcleNode(contentRoot);
    console.log("-----articleNode", articleNode);
  }
}

function findAritcleNode(root: Node): Node {
  if (root.nodeType != Node.ELEMENT_NODE) return null;
  let articleNode = null;
  //读取当前直接字节点包含p的
  // const pNodes = (root as any).querySelectorAll("p");
  const childNodes = Array.from(root.childNodes);
  const pNodes = childNodes.filter((node: any) => node.nodeName === "P");
  if (pNodes.length > 4) return root;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    articleNode = findAritcleNode(child);
    if (articleNode) return articleNode;
  }
  return null;
}


function analyzeTextParentNodes(root: Node) {
  // 初始化标签统计对象
  const tagStatistics: any = {};

  // 递归遍历DOM树，统计文本节点的父节点类型
  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 10) {
      const parentTag = node.parentNode?.nodeName;
      tagStatistics[parentTag] = (tagStatistics[parentTag] || 0) + 1;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of (node.childNodes as any)) {
        traverse(child);
      }
    }
  }

  traverse(root);

  // 输出统计结果
  console.log("tagStatistics", tagStatistics);

  // 基于统计结果判断是否可能是文章
  const paragraphCount = tagStatistics['P'] || 0;
  const headingCount = (tagStatistics['H1'] || 0) + (tagStatistics['H2'] || 0) + (tagStatistics['H3'] || 0);

  if (paragraphCount > 5 && headingCount > 0) {
    console.log('This is likely an article.');
  } else {
    console.log('This is unlikely an article.');
  }
}
