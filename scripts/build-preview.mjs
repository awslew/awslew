#!/usr/bin/env node
/**
 * 生成 preview.html：用 GitHub 官方 Markdown CSS 渲染 README.md，
 * 复刻 GitHub 真实渲染行为，供 Playwright 截图验收。
 *
 * 关键复刻点：
 *  - SVG 以 <img> 方式引入 → 外部 CSS 不穿透，SVG 必须自包含（本方案已满足）
 *  - 相对路径 ./assets/x.svg 需解析到文件系统（file:// 天然支持）
 *  - GitHub 会给 markdown-body 加 15px 字号与 max-width: 1012px
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');

/* 一个够用的 Markdown → HTML 子集转换（本 README 只用到这些语法）
 * HTML 块用「标签深度」追踪，不用行匹配 —— 避免漏推进指针造成死循环。 */
const VOID_TAGS = new Set(['img', 'source', 'br', 'hr', 'input', 'meta', 'link']);

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  let html = '';

  const inline = (s) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/<(\/?(?:picture|source|img|div|details|summary|sub|a|br|h[1-6]|p)\b[^>]*?\/?)>/gi, '\u0000$1\u0001')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\u0000(.*?)\u0001/g, '<$1>');

  /* 统计一行里的标签净开合（跳过自闭合与 void 标签） */
  const depthDelta = (line) => {
    let delta = 0;
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
    let m;
    while ((m = re.exec(line))) {
      const [, closing, tag, selfClose] = m;
      if (VOID_TAGS.has(tag.toLowerCase()) || selfClose) continue;
      delta += closing ? -1 : 1;
    }
    return delta;
  };

  while (i < lines.length) {
    const line = lines[i];

    /* 1. 水平线 */
    if (/^\s*---+\s*$/.test(line)) {
      html += '<hr>\n';
      i++;
      continue;
    }

    /* 2. 标题 */
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>\n`;
      i++;
      continue;
    }

    /* 3. HTML 块：从起标签行累积到深度归零 */
    if (/^\s*</.test(line) && depthDelta(line) > 0) {
      let depth = 0;
      const buf = [];
      while (i < lines.length) {
        const cur = lines[i];
        // <details> 内的 Markdown 需要单独处理，这里先整体收进来
        buf.push(cur);
        depth += depthDelta(cur);
        i++;
        if (depth <= 0) break;
      }
      html += expandDetails(buf) + '\n';
      continue;
    }

    /* 4. 单行 HTML（自闭合 / 已闭合） */
    if (/^\s*</.test(line)) {
      html += inline(line) + '\n';
      i++;
      continue;
    }

    /* 5. 表格 */
    if (/^\s*\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      html += '<table>\n';
      body.forEach((r, idx) => {
        const cells = r.trim().replace(/^\||\|$/g, '').split('|');
        const tag = idx === 0 ? 'th' : 'td';
        const align = cells.map(() => '').join('');
        html += '<tr>' + cells.map((c) => `<${tag}${align}>${inline(c.trim())}</${tag}>`).join('') + '</tr>\n';
      });
      html += '</table>\n';
      continue;
    }

    /* 6. 无序列表 */
    if (/^\s*[-*]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    /* 7. 空行 */
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    /* 8. 段落 */
    const para = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*[|#]/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) html += `<p>${inline(para.join('\n'))}</p>\n`;
  }

  return html;
}

/** <details> 内部的 Markdown 需要转成 HTML，否则显示为原文 */
function expandDetails(buf) {
  const out = [];
  let insideDetails = false;
  for (const line of buf) {
    if (/^\s*<details>/.test(line)) {
      out.push('<details>');
      insideDetails = true;
      continue;
    }
    if (/^\s*<\/details>/.test(line)) {
      out.push('</details>');
      insideDetails = false;
      continue;
    }
    if (/^\s*<summary>/.test(line)) {
      out.push(`<summary>${line.replace(/<\/?summary>/g, '').trim()}</summary>`);
      continue;
    }
    if (!insideDetails) {
      out.push(line);
      continue;
    }
    if (/^\s*$/.test(line) || /^\s*<br>\s*$/.test(line)) {
      out.push('');
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      out.push(`<ul><li>${li[1].replace(/&/g, '&amp;').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</li></ul>`);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

const body = mdToHtml(readme);

const page = (scheme) => `<!doctype html>
<html lang="zh-CN" data-color-mode="${scheme}" data-${scheme}-theme="${scheme === 'dark' ? 'dark' : 'light'}">
<head>
<meta charset="utf-8">
<title>README preview — ${scheme}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown.css">
<style>
  html, body { margin: 0; padding: 0; background: ${scheme === 'dark' ? '#0d1117' : '#ffffff'}; }
  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 1012px; margin: 0 auto; padding: 32px 24px 64px; }
  .markdown-body img { max-width: 100%; }
  .markdown-body picture { display: block; }
  .markdown-body picture img { width: 100%; height: auto; }
  .markdown-body details { border: none; }
  .markdown-body details > summary { cursor: pointer; }
  /* GitHub 对表格的默认样式补充 */
  .markdown-body table { display: table; width: 100%; }
</style>
</head>
<body>
<article class="markdown-body">
${body}
</article>
</body>
</html>
`;

writeFileSync(resolve(ROOT, 'preview-dark.html'), page('dark'), 'utf8');
writeFileSync(resolve(ROOT, 'preview-light.html'), page('light'), 'utf8');
console.log('✓ preview-dark.html / preview-light.html');
