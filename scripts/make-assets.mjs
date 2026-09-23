#!/usr/bin/env node
/**
 * 由 data.json 生成 README 用的自包含 SVG。
 * 视觉系统（一套 token，两个主题）：
 *   强调色 冷青 #2F81F7(dark) / #0969DA(light)，全站唯一强调色
 *   中性色 GitHub Primer 冷灰阶
 *   圆角锁 12px（卡片）/ 6px（小元素）
 * 不依赖任何第三方卡片服务，所有文字用 <text>，字体栈指向系统等宽/无衬线。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const PITCH = JSON.parse(readFileSync(resolve(HERE, 'project-pitch.json'), 'utf8'));
const OUT = resolve(ROOT, 'assets');

const MONO = "ui-monospace,'SF Mono','Cascadia Mono','Segoe UI Mono',Menlo,Consolas,'Liberation Mono',monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif";

/* ── 主题 token ─────────────────────────────────────────── */
const THEMES = {
  dark: {
    canvas: '#0D1117',
    canvasEdge: '#21262D',
    surface: '#161B22',
    hairline: '#30363D',
    fg: '#E6EDF3',
    fgMuted: '#8B949E',
    fgSubtle: '#6E7681',
    accent: '#2F81F7',
    accentSoft: '#1F6FEB',
    accentGlow: '#58A6FF',
    heatEmpty: '#161B22',
    heatRamp: ['#0E4429', '#006D32', '#26A641', '#39D353'],
    dotRed: '#FF5F57',
    dotAmber: '#FEBC2E',
    dotGreen: '#28C840',
    barTrack: '#21262D',
  },
  light: {
    canvas: '#FFFFFF',
    canvasEdge: '#D0D7DE',
    surface: '#F6F8FA',
    hairline: '#D8DEE4',
    fg: '#1F2328',
    fgMuted: '#4A5560',
    fgSubtle: '#6E7781',
    accent: '#0969DA',
    accentSoft: '#0550AE',
    accentGlow: '#0969DA',
    heatEmpty: '#EAEEF2',
    heatRamp: ['#9BE9A8', '#40C463', '#30A14E', '#216E39'],
    dotRed: '#FF5F57',
    dotAmber: '#FEBC2E',
    dotGreen: '#28C840',
    barTrack: '#EAEEF2',
  },
};

/* ── 工具 ───────────────────────────────────────────────── */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isWide = (ch) => /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u3000-\u303F\uFF01-\uFF60]/.test(ch);

/** 文本截断：按「显示宽度」估算（CJK 记 2），英文断在词边界，末尾加省略号 */
function widthOf(str) {
  let w = 0;
  for (const ch of str) w += isWide(ch) ? 2 : 1;
  return w;
}
function clamp(str, maxUnits) {
  if (widthOf(str) <= maxUnits) return str;
  let out = '';
  let w = 0;
  for (const ch of str) {
    const cw = isWide(ch) ? 2 : 1;
    if (w + cw > maxUnits - 2) break;
    out += ch;
    w += cw;
  }
  // 英文按词边界收尾，避免截出半个单词
  if (/[A-Za-z0-9]$/.test(out)) {
    const sp = out.lastIndexOf(' ');
    if (sp > out.length * 0.55) out = out.slice(0, sp);
  }
  return out.replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/** 估算一段文字在给定字号下的像素宽度 */
function pixelWidth(str, size, mono = false) {
  let w = 0;
  for (const ch of str) {
    if (isWide(ch)) w += size;
    else w += size * (mono ? 0.62 : 0.52);
  }
  return w;
}

/** 千分位 */
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** 紧凑数字：1200 → 1.2k */
const compact = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

const svgOpen = (w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
  `role="img" aria-label="${esc(title)}" font-family="${SANS}">`;

/* ── 1. hero.svg：终端窗口 ───────────────────────────────── */
function hero(t) {
  const W = 920;
  const H = 288;
  const tlH = 46; // title bar 高
  const pad = 34;
  const fg = t.fg;
  const pre = 'awslew';

  // 头像内嵌为 base64：SVG 以 <img> 加载时外部图片引用会被浏览器阻断
  let avatarHref = '';
  try {
    const buf = readFileSync(resolve(OUT, 'avatar.png'));
    avatarHref = `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    avatarHref = '';
  }

  const cmd = 'whoami --verbose';
  const AV = 80; // 头像边长
  const avX = W - pad - AV;
  const avY = 86;
  const textMaxUnits = Math.floor((avX - pad - 28) / 8.7);

  // 终端输出三行：基线 108 / 138 / 163 / 185
  const lines = [
    ['awslew · local-first tooling for AI coding agents', 17, '600', fg],
    ['给 AI 编码助手造本地工具：MCP 服务、任务编排、视觉层、Windows 实用件。', 14.5, '400', t.fgMuted],
    [`${data.totals.publicRepos} public repos · TypeScript / Python / JavaScript · 中英双语文档`, 13.5, '400', t.fgSubtle],
  ];

  let body = '';
  let y = 108;

  body += `<text x="${pad}" y="${y}" font-family="${MONO}" font-size="15.5" fill="${t.fgSubtle}">` +
    `<tspan fill="${t.accentGlow}">${esc(pre)}@github</tspan>` +
    `<tspan fill="${t.fgSubtle}">:</tspan>` +
    `<tspan fill="${t.accent}">~</tspan>` +
    `<tspan fill="${t.fgSubtle}">$ </tspan>` +
    `<tspan fill="${fg}" font-weight="600">${esc(cmd)}</tspan>` +
    `<tspan fill="${t.accentGlow}"> ▍</tspan>` +
    `</text>`;

  y += 32;
  for (const [text, size, weight, color] of lines) {
    body += `<text x="${pad}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}"` +
      (size === 17 ? '' : ' font-family="' + SANS + '"') +
      `>${esc(clamp(text, textMaxUnits))}</text>`;
    y += size === 17 ? 30 : 25;
  }
  const lastLineBaseline = y - 25; // 最后一行基线，供状态行定位

  // 头像（圆角方形 + 渐变描边），放在右上，与文本块同高，不留空白
  if (avatarHref) {
    const r = 18;
    body +=
      `<defs>` +
      `<clipPath id="avclip"><rect x="${avX}" y="${avY}" width="${AV}" height="${AV}" rx="${r}"/></clipPath>` +
      `<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${t.accentGlow}"/><stop offset="1" stop-color="${t.accentSoft}"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<image href="${avatarHref}" x="${avX}" y="${avY}" width="${AV}" height="${AV}" ` +
      `clip-path="url(#avclip)" preserveAspectRatio="xMidYMid slice"/>` +
      `<rect x="${avX - 0.75}" y="${avY - 0.75}" width="${AV + 1.5}" height="${AV + 1.5}" rx="${r + 0.75}" ` +
      `fill="none" stroke="url(#ring)" stroke-width="1.5"/>`;
  }

  // 底部状态：语义状态点，不是装饰。与最后一行文字保持 30px 净空。
  const statusY = lastLineBaseline + 30;
  body +=
    `<line x1="${pad}" y1="${statusY - 28}" x2="${W - pad}" y2="${statusY - 28}" stroke="${t.hairline}"/>` +
    `<circle cx="${pad + 5}" cy="${statusY - 4}" r="4" fill="${t.dotGreen}"/>` +
    `<text x="${pad + 18}" y="${statusY}" font-size="13" fill="${t.fgMuted}" font-family="${SANS}">` +
    `Open to collaboration · MIT licensed · 现在在啃 agent 本地工具链</text>`;

  return (
    svgOpen(W, H, `${data.owner} profile hero`) +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.canvas}" stroke="${t.canvasEdge}"/>` +
    `<path d="M0.5 12.5A12 12 0 0 1 12.5 0.5H${W - 12.5}A12 12 0 0 1 ${W - 0.5} 12.5V${tlH}H0.5Z" fill="${t.surface}"/>` +
    `<line x1="0.5" y1="${tlH}" x2="${W - 0.5}" y2="${tlH}" stroke="${t.canvasEdge}"/>` +
    `<circle cx="26" cy="23" r="6" fill="${t.dotRed}"/>` +
    `<circle cx="46" cy="23" r="6" fill="${t.dotAmber}"/>` +
    `<circle cx="66" cy="23" r="6" fill="${t.dotGreen}"/>` +
    `<text x="${W / 2}" y="28" font-family="${MONO}" font-size="12.5" fill="${t.fgSubtle}" text-anchor="middle">awslew@github - zsh</text>` +
    body +
    `</svg>\n`
  );
}

/* ── 2. stats.svg：贡献热力图 + 关键指标 ─────────────────── */
function stats(t) {
  const W = 920;
  const H = 226;
  const cell = 11.5;
  const gap = 3.4;
  const step = cell + gap;
  const days = data.contribution.days;

  // 按周分列（数据已按周分组返回，这里按 7 天切）
  const cols = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
  const gridW = cols.length * step - gap;
  const gridX = (W - gridW) / 2;
  const gridY = 92;

  const level0 = data.contribution.days.map((d) => d.contributionCount).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => (level0.length ? level0[Math.min(level0.length - 1, Math.floor(level0.length * p))] : 1);
  const p50 = q(0.5);
  const p75 = q(0.75);
  const p95 = q(0.95);
  const level = (c) => (!c ? 0 : c <= p50 ? 1 : c <= p75 ? 2 : c <= p95 ? 3 : 4);
  const ramp = [t.heatEmpty, ...t.heatRamp];

  let cells = '';
  cols.forEach((col, ci) => {
    col.forEach((d, di) => {
      cells += `<rect x="${(gridX + ci * step).toFixed(1)}" y="${gridY + di * step}" width="${cell}" height="${cell}" rx="2.5" fill="${ramp[level(d.contributionCount)]}"/>`;
    });
  });

  // 顶部三项指标
  const metrics = [
    [fmt(data.contribution.totalCommits), 'commits'],
    [String(data.totals.publicRepos), 'public repos'],
    [compact(data.totals.stars), 'stars'],
  ];
  const colW = W / 3;
  let mt = '';
  metrics.forEach(([v, label], i) => {
    const cx = colW * i + colW / 2;
    mt +=
      `<text x="${cx}" y="52" font-size="30" font-weight="700" fill="${t.fg}" text-anchor="middle" ` +
      `font-family="${MONO}" letter-spacing="-1">${esc(v)}</text>` +
      `<text x="${cx}" y="72" font-size="12.5" fill="${t.fgMuted}" text-anchor="middle" ` +
      `letter-spacing="0.6">${esc(label.toUpperCase())}</text>`;
    if (i < 2) mt += `<line x1="${colW * (i + 1)}" y1="32" x2="${colW * (i + 1)}" y2="66" stroke="${t.hairline}"/>`;
  });

  // 图例
  const legendY = gridY + 7 * step + 20;
  let legend =
    `<text x="${gridX}" y="${legendY + 4}" font-size="12" fill="${t.fgSubtle}">` +
    `过去 53 周 · ${data.contribution.yearTotal} 次贡献</text>`;
  const lgW = 5 * (cell - 2 + 3);
  let lx = W - gridX - lgW;
  legend += `<text x="${lx - 10}" y="${legendY + 4}" font-size="11" fill="${t.fgSubtle}" text-anchor="end">少</text>`;
  for (let i = 0; i < 5; i++) {
    legend += `<rect x="${lx + i * (cell - 2 + 3)}" y="${legendY - 5}" width="${cell - 2}" height="${cell - 2}" rx="2" fill="${ramp[i]}"/>`;
  }
  legend += `<text x="${lx + lgW + 6}" y="${legendY + 4}" font-size="11" fill="${t.fgSubtle}">多</text>`;

  return (
    svgOpen(W, H, 'Contribution graph and key metrics') +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.canvas}" stroke="${t.canvasEdge}"/>` +
    mt +
    `<line x1="24" y1="80.5" x2="${W - 24}" y2="80.5" stroke="${t.hairline}"/>` +
    cells +
    legend +
    `</svg>\n`
  );
}

/* ── 3. projects.svg：精选项目卡片 ───────────────────────── */
const PROJECT_META = {
  'web-search-mcp': { mark: 'WS', tag: 'MCP · 检索' },
  'codex-agent-chain': { mark: 'AC', tag: 'MCP · 编排' },
  'codex-auto-resume-trio': { mark: 'CR', tag: 'Codex · 自动化' },
  'continuity-orchestrator': { mark: 'CO', tag: 'MCP · 本地文件' },
  'webgpt-drive': { mark: 'WG', tag: '浏览器自动化' },
  'ds-vision-kit': { mark: 'VK', tag: '视觉 · 多模态' },
  'apiquota-dashboard': { mark: 'AQ', tag: 'Windows · 托盘' },
  'screenshot-paste-assistant': { mark: 'SP', tag: 'Windows · 效率' },
  'lottery-one-pick': { mark: 'LP', tag: 'Python · CLI' },
};

function projects(t) {
  const picked = data.repos.slice(0, 6);
  const W = 920;
  const gap = 16;
  const cardW = (W - gap) / 2;
  const cardH = 112;
  const rows = Math.ceil(picked.length / 2);
  const H = rows * cardH + (rows - 1) * gap;

  let out = '';
  picked.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * (cardW + gap);
    const y = row * (cardH + gap);
    const meta = PROJECT_META[r.name] || { mark: r.name.slice(0, 2).toUpperCase(), tag: r.language || '' };
    const pad = 18;
    const textX = x + pad;
    const avail = cardW - pad * 2;

    // 语言色点（GitHub 官方语言色）
    const LANG_COLOR = { Python: '#3572A5', TypeScript: '#3178C6', JavaScript: '#F1E05A' };
    const lc = LANG_COLOR[r.language] || t.fgSubtle;

    // 描述排两行（12.5px），优先用手写中文定位，保留信息更多
    const [l1, l2] = wrapToLines(projectPitch(r), avail, 12.5, 2);

    out +=
      `<a href="${esc(r.url)}" target="_blank">` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cardW - 1}" height="${cardH - 1}" rx="12" fill="${t.surface}" stroke="${t.canvasEdge}"/>` +
      // 左侧标记块
      `<rect x="${textX}" y="${y + pad}" width="34" height="34" rx="8" fill="${t.accent}" opacity="0.14"/>` +
      `<text x="${textX + 17}" y="${y + pad + 22}" font-size="13" font-weight="700" fill="${t.accentGlow}" ` +
      `text-anchor="middle" font-family="${MONO}">${esc(meta.mark)}</text>` +
      // 仓库名（过长则截断，避免压到卡片边缘）
      `<text x="${textX + 46}" y="${y + pad + 15}" font-size="15" font-weight="600" fill="${t.fg}" font-family="${MONO}">` +
      `${esc(clampToWidth(r.name, avail - 46 - 8, 15, true))}</text>` +
      // 标签
      `<text x="${textX + 46}" y="${y + pad + 32}" font-size="11.5" fill="${t.fgSubtle}">${esc(meta.tag)}</text>` +
      // 描述两行
      `<text x="${textX}" y="${y + 74}" font-size="12.5" fill="${t.fgMuted}">${esc(l1)}</text>` +
      (l2 ? `<text x="${textX}" y="${y + 91}" font-size="12.5" fill="${t.fgMuted}">${esc(l2)}</text>` : '') +
      // 底部：语言点 + 语言名 + star
      `<circle cx="${textX + 4}" cy="${y + cardH - 14}" r="4.5" fill="${lc}"/>` +
      `<text x="${textX + 15}" y="${y + cardH - 10}" font-size="11.5" fill="${t.fgSubtle}">${esc(r.language || '—')}</text>` +
      `<text x="${x + cardW - pad}" y="${y + cardH - 10}" font-size="11.5" fill="${t.fgSubtle}" text-anchor="end">★ ${r.stars}</text>` +
      `</a>`;
  });

  return svgOpen(W, H, 'Selected open source projects') + out + `</svg>\n`;
}

/** 取项目定位：手写中文优先，否则回退到英文描述首句 */
function projectPitch(repo) {
  if (PITCH[repo.name]) return PITCH[repo.name];
  return firstLine(repo.description);
}

/** 取描述第一行（去掉中文长尾，保留英文首句） */
function firstLine(desc) {
  if (!desc) return '';
  const m = desc.match(/\s+[·—]\s+/);
  if (m && m.index) return desc.slice(0, m.index).trim();
  return desc.split('\n')[0].trim();
}

/** 按像素宽度硬截断（用于不能换行的单元，如仓库名） */
function clampToWidth(str, maxPx, size, mono = false) {
  if (pixelWidth(str, size, mono) <= maxPx) return str;
  let out = '';
  let w = 0;
  for (const ch of str) {
    const cw = isWide(ch) ? size : size * (mono ? 0.62 : 0.52);
    if (w + cw > maxPx - size * 0.8) break;
    out += ch;
    w += cw;
  }
  return out.replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/**
 * 按像素宽度把文本排成最多 maxLines 行。
 * 英文在词边界断行，中文逐字断行；末行放不下时加省略号。
 */
function wrapToLines(str, maxPx, size, maxLines) {
  const lines = [];
  let rest = str.trim();
  let guard = 0;

  while (rest && lines.length < maxLines && guard++ < 40) {
    if (pixelWidth(rest, size) <= maxPx) {
      lines.push(rest);
      rest = '';
      break;
    }
    // 贪心取到超宽前的位置
    let cur = '';
    let w = 0;
    for (const ch of rest) {
      const cw = isWide(ch) ? size : size * 0.52;
      if (w + cw > maxPx) break;
      cur += ch;
      w += cw;
    }
    // 英文尽量断在词边界
    if (/[A-Za-z0-9]$/.test(cur)) {
      const sp = cur.lastIndexOf(' ');
      if (sp > cur.length * 0.55) cur = cur.slice(0, sp);
    }
    const isLastLine = lines.length === maxLines - 1;
    const remainder = rest.slice(cur.length).trim();
    if (isLastLine) {
      lines.push(remainder ? cur.replace(/[\s,;:.\-–—]+$/, '') + '…' : cur);
      rest = '';
      break;
    }
    lines.push(cur.trimEnd());
    rest = remainder;
  }

  return lines;
}

/* ── 4. tools.svg：技术栈条 ──────────────────────────────── */
function tools(t) {
  const W = 920;
  const H = 74;
  const items = [
    ['TypeScript', '#3178C6'],
    ['Python', '#3572A5'],
    ['Node.js', '#5FA04E'],
    ['MCP', t.accentGlow],
    ['GitHub Actions', '#2088FF'],
    ['Windows', '#0078D4'],
    ['Playwright', '#2EAD33'],
    ['Claude Code', '#D97757'],
    ['Codex', '#8B949E'],
  ];
  const pad = 22;
  const chipH = 30;
  let x = pad;
  let out = '';

  // 等距排布：先算总宽再居中
  const widths = items.map(([label]) => widthOf(label) * 6.6 + 30);
  const total = widths.reduce((a, b) => a + b, 0) + 10 * (items.length - 1);
  x = (W - total) / 2;

  items.forEach(([label, color], i) => {
    const w = widths[i];
    out +=
      `<rect x="${x.toFixed(1)}" y="${(H - chipH) / 2}" width="${w.toFixed(1)}" height="${chipH}" rx="6" fill="${t.surface}" stroke="${t.canvasEdge}"/>` +
      `<circle cx="${(x + 15).toFixed(1)}" cy="${H / 2}" r="4" fill="${color}"/>` +
      `<text x="${(x + 26).toFixed(1)}" y="${H / 2 + 4.5}" font-size="12.5" fill="${t.fg}" font-family="${SANS}">${esc(label)}</text>`;
    x += w + 10;
  });

  return svgOpen(W, H, 'Tech stack') + out + `</svg>\n`;
}

/* ── 输出 ───────────────────────────────────────────────── */
mkdirSync(OUT, { recursive: true });
const written = [];

function emit(name, content) {
  const p = resolve(OUT, name);
  writeFileSync(p, content, 'utf8');
  written.push(`${name} (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)`);
}

for (const [key, t] of Object.entries(THEMES)) {
  emit(`hero-${key}.svg`, hero(t));
  emit(`stats-${key}.svg`, stats(t));
  emit(`projects-${key}.svg`, projects(t));
  emit(`tools-${key}.svg`, tools(t));
}

console.log('✓ 生成资产：');
written.forEach((w) => console.log('   ' + w));

/* ── 自检：文本是否越界 ──────────────────────────────────── */
let overflow = 0;
for (const [key] of Object.entries(THEMES)) {
  for (const family of ['hero', 'stats', 'projects', 'tools']) {
    const svg = readFileSync(resolve(OUT, `${family}-${key}.svg`), 'utf8');
    const svgW = parseInt(svg.match(/width="(\d+)"/)[1], 10);
    const re = /<text([^>]*)>([^<]*)<\/text>/g;
    let m;
    while ((m = re.exec(svg))) {
      const attrs = m[1];
      const x = parseFloat((attrs.match(/\bx="([\d.]+)"/) || [, '0'])[1]);
      const size = parseFloat((attrs.match(/font-size="([\d.]+)"/) || [, '14'])[1]);
      const anchor = (attrs.match(/text-anchor="(\w+)"/) || [, 'start'])[1];
      const mono = /ui-monospace/.test(attrs);
      const text = m[2].replace(/<[^>]+>/g, '');
      const est = pixelWidth(text, size, mono);
      // 按锚点算左右边界
      const left = anchor === 'end' ? x - est : anchor === 'middle' ? x - est / 2 : x;
      const right = anchor === 'end' ? x : anchor === 'middle' ? x + est / 2 : x + est;
      // 投影卡片时，再考虑它是左列还是右列
      const limit = family === 'projects' ? svgW - 8 : svgW - 8;
      if (right > limit || left < 4) {
        console.log(
          `   ⚠ ${family}-${key}: 越界 [${left.toFixed(0)}, ${right.toFixed(0)}] / ${limit}  ` +
          `"${text.slice(0, 30)}"`
        );
        overflow++;
      }
    }
  }
}
console.log(overflow ? `⚠ ${overflow} 处疑似越界` : '✓ 文本边界自检通过');
