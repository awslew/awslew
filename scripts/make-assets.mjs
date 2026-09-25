#!/usr/bin/env node
/**
 * 由 data.json 生成 README 用的自包含 SVG。
 *
 * 尺寸前提：GitHub 个人主页是**窄栏布局**，README 容器实测约 397px。
 * 所以设计宽度取 640（缩放约 0.62），字号按 13-15 排，缩后仍有 8-9px 可读。
 * 仓库页等宽容器里会被放大到 ~800px，同样清晰。
 *
 * 视觉系统（一套 token，两个主题）：
 *   强调色 冷青 #2F81F7(dark) / #0969DA(light)，全站唯一强调色
 *   中性色 GitHub Primer 冷灰阶
 *   圆角锁 12px（卡片）/ 6px（小元素）
 * 所有文字用 <text>；头像 base64 内嵌（SVG 以 <img> 加载时外部引用会被阻断）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const PITCH = JSON.parse(readFileSync(resolve(HERE, 'project-pitch.json'), 'utf8'));
const OUT = resolve(ROOT, 'assets');

const W = 640;          // 设计宽度，对齐 GitHub 主页窄栏
const PAD = 24;         // 卡片内边距
const RADIUS = 12;      // 圆角锁

const MONO = "ui-monospace,'SF Mono','Cascadia Mono','Segoe UI Mono',Menlo,Consolas,'Liberation Mono',monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif";

/* ── 主题 token ─────────────────────────────────────────── */
const THEMES = {
  dark: {
    canvas: '#0D1117', canvasEdge: '#21262D', surface: '#161B22', hairline: '#30363D',
    fg: '#E6EDF3', fgMuted: '#9BA6B2', fgSubtle: '#7D8590',
    accent: '#2F81F7', accentSoft: '#1F6FEB', accentGlow: '#58A6FF',
    dotRed: '#FF5F57', dotAmber: '#FEBC2E', dotGreen: '#28C840',
    chip: '#161B22', chipEdge: '#30363D',
  },
  light: {
    canvas: '#FFFFFF', canvasEdge: '#D0D7DE', surface: '#F6F8FA', hairline: '#D8DEE4',
    fg: '#1F2328', fgMuted: '#4A5560', fgSubtle: '#6E7781',
    accent: '#0969DA', accentSoft: '#0550AE', accentGlow: '#0969DA',
    dotRed: '#FF5F57', dotAmber: '#FEBC2E', dotGreen: '#28C840',
    chip: '#F6F8FA', chipEdge: '#D0D7DE',
  },
};

/* ── 工具 ───────────────────────────────────────────────── */
const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isWide = (ch) =>
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u3000-\u303F\uFF01-\uFF60]/.test(ch);

/** 估算一段文字在给定字号下的像素宽度 */
function pixelWidth(str, size, mono = false) {
  let w = 0;
  for (const ch of str) w += isWide(ch) ? size : size * (mono ? 0.62 : 0.52);
  return w;
}

/** 按像素宽度硬截断（用于不能换行的单元），英文断在词边界并加省略号 */
function clampToWidth(str, maxPx, size, mono = false) {
  if (pixelWidth(str, size, mono) <= maxPx) return str;
  let out = '';
  let w = 0;
  for (const ch of str) {
    const cw = isWide(ch) ? size : size * (mono ? 0.62 : 0.52);
    if (w + cw > maxPx - size * 0.9) break;
    out += ch;
    w += cw;
  }
  if (/[A-Za-z0-9]$/.test(out)) {
    const sp = out.lastIndexOf(' ');
    if (sp > out.length * 0.55) out = out.slice(0, sp);
  }
  return out.replace(/[\s,;:.\-–—/]+$/, '') + '…';
}

/** 按像素宽度把文本排成最多 maxLines 行（中文逐字、英文按词断行） */
function wrapToLines(str, maxPx, size, maxLines) {
  const lines = [];
  let rest = String(str || '').trim();
  let guard = 0;

  while (rest && lines.length < maxLines && guard++ < 40) {
    if (pixelWidth(rest, size) <= maxPx) {
      lines.push(rest);
      break;
    }
    let cur = '';
    let w = 0;
    for (const ch of rest) {
      const cw = isWide(ch) ? size : size * 0.52;
      if (w + cw > maxPx) break;
      cur += ch;
      w += cw;
    }
    if (/[A-Za-z0-9]$/.test(cur)) {
      const sp = cur.lastIndexOf(' ');
      if (sp > cur.length * 0.55) cur = cur.slice(0, sp);
    }
    const remainder = rest.slice(cur.length).trim();
    if (lines.length === maxLines - 1) {
      lines.push(remainder ? cur.replace(/[\s,;:.\-–—/]+$/, '') + '…' : cur);
      break;
    }
    lines.push(cur.trimEnd());
    rest = remainder;
  }

  return lines;
}

const svgOpen = (w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
  `role="img" aria-label="${esc(title)}" font-family="${SANS}">`;

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** 取项目定位：手写中文优先，否则回退英文描述首句 */
function projectPitch(repo) {
  if (PITCH[repo.name]) return PITCH[repo.name];
  const d = repo.description || '';
  const m = d.match(/\s+[·—]\s+/);
  return m && m.index ? d.slice(0, m.index).trim() : d.split('\n')[0].trim();
}

/* ── 1. hero.svg：终端窗口 ───────────────────────────────── */
function hero(t) {
  const H = 252;
  const tlH = 44;
  const fg = t.fg;

  // 头像内嵌为 base64
  let avatarHref = '';
  try {
    avatarHref = `data:image/png;base64,${readFileSync(resolve(OUT, 'avatar.png')).toString('base64')}`;
  } catch {
    avatarHref = '';
  }

  const AV = 66;
  const avX = W - PAD - AV;
  const avY = 72;
  const textMax = avX - PAD - 16; // 文本可用宽度，别压到头像

  let body = '';
  let y = 90;

  // prompt + 命令
  body += `<text x="${PAD}" y="${y}" font-family="${MONO}" font-size="14" fill="${t.fgSubtle}">` +
    `<tspan fill="${t.accentGlow}">awslew@github</tspan>` +
    `<tspan fill="${t.fgSubtle}">:</tspan><tspan fill="${t.accent}">~</tspan>` +
    `<tspan fill="${t.fgSubtle}">$ </tspan>` +
    `<tspan fill="${fg}" font-weight="600">whoami --verbose</tspan>` +
    `<tspan fill="${t.accentGlow}"> ▍</tspan></text>`;

  // 三行输出
  const lines = [
    ['awslew · AI 工具，帮你把任务做完', 15, '600', fg],
    ['额度不够可接力，任务可分工，本机项目可直接读改。', 13, '400', t.fgMuted],
    ['9 个开源项目 · 视觉、搜索、配额与 Windows 效率工具', 12, '400', t.fgSubtle],
  ];
  y += 27;
  for (const [text, size, weight, color] of lines) {
    body += `<text x="${PAD}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">` +
      `${esc(clampToWidth(text, textMax, size))}</text>`;
    y += size === 15 ? 25 : 21;
  }
  const lastBaseline = y - 21;

  // 头像：圆角方块 + 渐变描边
  if (avatarHref) {
    const r = 15;
    body +=
      `<defs>` +
      `<clipPath id="avclip"><rect x="${avX}" y="${avY}" width="${AV}" height="${AV}" rx="${r}"/></clipPath>` +
      `<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${t.accentGlow}"/><stop offset="1" stop-color="${t.accentSoft}"/></linearGradient>` +
      `</defs>` +
      `<image href="${avatarHref}" x="${avX}" y="${avY}" width="${AV}" height="${AV}" ` +
      `clip-path="url(#avclip)" preserveAspectRatio="xMidYMid slice"/>` +
      `<rect x="${avX - 0.75}" y="${avY - 0.75}" width="${AV + 1.5}" height="${AV + 1.5}" rx="${r + 0.75}" ` +
      `fill="none" stroke="url(#ring)" stroke-width="1.5"/>`;
  }

  // 底部状态：分隔线 + 语义状态点，与最后一行保持 26px 净空
  const statusY = lastBaseline + 26;
  body +=
    `<line x1="${PAD}" y1="${statusY - 24}" x2="${W - PAD}" y2="${statusY - 24}" stroke="${t.hairline}"/>` +
    `<circle cx="${PAD + 4}" cy="${statusY - 4}" r="3.5" fill="${t.dotGreen}"/>` +
    `<text x="${PAD + 15}" y="${statusY}" font-size="12" fill="${t.fgMuted}">` +
    `${esc(clampToWidth('Open to collaboration · MIT licensed · 让 agent 真正帮你做事', W - PAD * 2 - 15, 12))}</text>`;

  return (
    svgOpen(W, H, `${data.owner} profile hero`) +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${RADIUS}" fill="${t.canvas}" stroke="${t.canvasEdge}"/>` +
    `<path d="M0.5 12.5A12 12 0 0 1 12.5 0.5H${W - 12.5}A12 12 0 0 1 ${W - 0.5} 12.5V${tlH}H0.5Z" fill="${t.surface}"/>` +
    `<line x1="0.5" y1="${tlH}" x2="${W - 0.5}" y2="${tlH}" stroke="${t.canvasEdge}"/>` +
    `<circle cx="22" cy="22" r="5.5" fill="${t.dotRed}"/>` +
    `<circle cx="40" cy="22" r="5.5" fill="${t.dotAmber}"/>` +
    `<circle cx="58" cy="22" r="5.5" fill="${t.dotGreen}"/>` +
    `<text x="${W / 2}" y="26.5" font-family="${MONO}" font-size="11.5" fill="${t.fgSubtle}" text-anchor="middle">awslew@github - zsh</text>` +
    body +
    `</svg>\n`
  );
}

/* ── 2. projects.svg：精选项目（窄栏单列卡） ──────────────── */
const PROJECT_META = {
  'web-search-mcp': { mark: 'WS', tag: 'Agent · 联网找资料' },
  'codex-job-orchestrator': { mark: 'CJ', tag: 'Codex · 任务分工省额度' },
  'codex-auto-resume-trio': { mark: 'CR', tag: 'Codex · 自动续跑' },
  'continuity-orchestrator': { mark: 'CO', tag: 'Chat · 本地读改/额度接力' },
  'webgpt-drive': { mark: 'WG', tag: 'ChatGPT · 网页求助' },
  'ds-vision-kit': { mark: 'VK', tag: 'Agent · 看懂图片' },
  'apiquota-dashboard': { mark: 'AQ', tag: 'Windows · 额度总览' },
  'screenshot-paste-assistant': { mark: 'SP', tag: 'Windows · 截图成文件' },
  'lottery-one-pick': { mark: 'LP', tag: '大乐透 · 选号对账' },
};

const LANG_COLOR = { Python: '#3572A5', TypeScript: '#3178C6', JavaScript: '#F1E05A' };

function projects(t) {
  const picked = data.repos.slice(0, 6);
  const cardH = 116;
  const gap = 12;
  const H = picked.length * cardH + (picked.length - 1) * gap;

  let out = '';
  picked.forEach((r, i) => {
    const y = i * (cardH + gap);
    const meta = PROJECT_META[r.name] || { mark: r.name.slice(0, 2).toUpperCase(), tag: r.language || '' };
    const textX = PAD + 44;               // 标记块右侧
    const avail = W - PAD - textX;        // 标题/标签可用宽度
    const descAvail = W - PAD * 2;        // 描述可用宽度
    const lc = LANG_COLOR[r.language] || t.fgSubtle;
    const [l1, l2] = wrapToLines(projectPitch(r), descAvail, 13, 2);

    out +=
      `<a href="${esc(r.url)}" target="_blank">` +
      `<rect x="0.5" y="${y + 0.5}" width="${W - 1}" height="${cardH - 1}" rx="${RADIUS}" fill="${t.surface}" stroke="${t.canvasEdge}"/>` +
      // 标记块
      `<rect x="${PAD}" y="${y + 20}" width="32" height="32" rx="8" fill="${t.accent}" opacity="0.14"/>` +
      `<text x="${PAD + 16}" y="${y + 41}" font-size="12.5" font-weight="700" fill="${t.accentGlow}" ` +
      `text-anchor="middle" font-family="${MONO}">${esc(meta.mark)}</text>` +
      // 仓库名 + 标签
      `<text x="${textX}" y="${y + 33}" font-size="15" font-weight="600" fill="${t.fg}" font-family="${MONO}">` +
      `${esc(clampToWidth(r.name, avail, 15, true))}</text>` +
      `<text x="${textX}" y="${y + 50}" font-size="12" fill="${t.fgSubtle}">${esc(meta.tag)}</text>` +
      // 描述两行
      `<text x="${PAD}" y="${y + 76}" font-size="13" fill="${t.fgMuted}">${esc(l1)}</text>` +
      (l2 ? `<text x="${PAD}" y="${y + 93}" font-size="13" fill="${t.fgMuted}">${esc(l2)}</text>` : '') +
      // 底部：语言 + star
      `<circle cx="${PAD + 4}" cy="${y + cardH - 14}" r="4.5" fill="${lc}"/>` +
      `<text x="${PAD + 15}" y="${y + cardH - 10}" font-size="12" fill="${t.fgSubtle}">${esc(r.language || '—')}</text>` +
      `<text x="${W - PAD}" y="${y + cardH - 10}" font-size="12" fill="${t.fgSubtle}" text-anchor="end">★ ${r.stars}</text>` +
      `</a>`;
  });

  return svgOpen(W, H, 'Selected open source projects') + out + `</svg>\n`;
}

/* ── 3. tools.svg：技术栈条 ──────────────────────────────── */
function tools(t) {
  const H = 76;
  const chipH = 30;
  const items = [
    ['TypeScript', '#3178C6'], ['Python', '#3572A5'], ['Node.js', '#5FA04E'], ['MCP', t.accentGlow],
    ['GitHub Actions', '#2088FF'], ['Windows', '#0078D4'], ['Playwright', '#2EAD33'],
    ['Claude Code', '#D97757'], ['Codex', '#8B949E'],
  ];

  const size = 12;
  const gapChip = 8;
  const widths = items.map(([label]) => pixelWidth(label, size) + 34);
  let total = widths.reduce((a, b) => a + b, 0) + gapChip * (items.length - 1);
  // 放不下就分两行
  const perRow = total <= W - PAD * 2 ? items.length : Math.ceil(items.length / 2);
  const rowsOf = [];
  let idx = 0;
  while (idx < items.length) {
    const slice = items.slice(idx, idx + perRow);
    const sliceW = slice.reduce((a, _, k) => a + widths[idx + k], 0) + gapChip * (slice.length - 1);
    rowsOf.push({ slice, width: sliceW });
    idx += perRow;
  }

  let out = '';
  const rowGap = 10;
  const totalH = rowsOf.length * chipH + (rowsOf.length - 1) * rowGap;
  let cy = (H - totalH) / 2;

  rowsOf.forEach(({ slice, width }) => {
    let x = (W - width) / 2;
    slice.forEach(([label, color]) => {
      const w = pixelWidth(label, size) + 34;
      out +=
        `<rect x="${x.toFixed(1)}" y="${cy}" width="${w.toFixed(1)}" height="${chipH}" rx="6" fill="${t.chip}" stroke="${t.chipEdge}"/>` +
        `<circle cx="${(x + 15).toFixed(1)}" cy="${cy + chipH / 2}" r="3.5" fill="${color}"/>` +
        `<text x="${(x + 25).toFixed(1)}" y="${cy + chipH / 2 + 4.2}" font-size="${size}" fill="${t.fg}">${esc(label)}</text>`;
      x += w + gapChip;
    });
    cy += chipH + rowGap;
  });

  return svgOpen(W, H, 'Tech stack') + out + `</svg>\n`;
}

/* ── 输出 ───────────────────────────────────────────────── */
mkdirSync(OUT, { recursive: true });
const written = [];
const emit = (name, content) => {
  writeFileSync(resolve(OUT, name), content, 'utf8');
  written.push(`${name} (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)`);
};

for (const [key, t] of Object.entries(THEMES)) {
  emit(`hero-${key}.svg`, hero(t));
  emit(`projects-${key}.svg`, projects(t));
  emit(`tools-${key}.svg`, tools(t));
}

console.log('✓ 生成资产：');
written.forEach((w) => console.log('   ' + w));

/* ── 自检：文本是否越界 ──────────────────────────────────── */
let overflow = 0;
for (const [key] of Object.entries(THEMES)) {
  for (const family of ['hero', 'projects', 'tools']) {
    const svg = readFileSync(resolve(OUT, `${family}-${key}.svg`), 'utf8');
    const re = /<text([^>]*)>([^<]*)<\/text>/g;
    let m;
    while ((m = re.exec(svg))) {
      const attrs = m[1];
      const x = parseFloat((attrs.match(/\bx="([\d.]+)"/) || [, '0'])[1]);
      const size = parseFloat((attrs.match(/font-size="([\d.]+)"/) || [, '13'])[1]);
      const anchor = (attrs.match(/text-anchor="(\w+)"/) || [, 'start'])[1];
      const mono = /ui-monospace/.test(attrs);
      const text = m[2].replace(/<[^>]+>/g, '');
      const est = pixelWidth(text, size, mono);
      const left = anchor === 'end' ? x - est : anchor === 'middle' ? x - est / 2 : x;
      const right = anchor === 'end' ? x : anchor === 'middle' ? x + est / 2 : x + est;
      if (right > W - 6 || left < 2) {
        console.log(`   ⚠ ${family}-${key}: 越界 [${left.toFixed(0)}, ${right.toFixed(0)}] / ${W}  "${text.slice(0, 28)}"`);
        overflow++;
      }
    }
  }
}
console.log(overflow ? `⚠ ${overflow} 处疑似越界` : '✓ 文本边界自检通过');
