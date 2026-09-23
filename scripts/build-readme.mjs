#!/usr/bin/env node
/**
 * 由 data.json 生成 README.md。
 * 设计原则：
 *  1. 主视觉走仓库内自包含 SVG（相对路径），不依赖任何第三方卡片服务 → 永不碎图
 *  2. 关键文字信息同时以 Markdown 文本给出 → 可被搜索引擎 / AI 检索到，且图片挂了也不丢信息
 *  3. 唯一的第三方图片是小尺寸社交徽章与访问计数
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const PITCH = JSON.parse(readFileSync(resolve(HERE, 'project-pitch.json'), 'utf8'));
const { owner, user, repos, totals, contribution } = data;

/** 项目一句话定位（与 assets 生成共用 scripts/project-pitch.json） */
const pitchOf = (repo) => PITCH[repo.name] || repo.description || '';

const BADGE = 'https://img.shields.io/badge';
const VISITORS = `https://komarev.com/ghpvc/?username=${owner}&color=2F81F7&style=flat-square&label=PROFILE+VIEWS`;

/** 双主题图片：<picture> 按访客配色自动切 */
const dual = (name, alt, cls = '') =>
  `<picture${cls ? ` class="${cls}"` : ''}>\n` +
  `  <source media="(prefers-color-scheme: dark)" srcset="./assets/${name}-dark.svg">\n` +
  `  <source media="(prefers-color-scheme: light)" srcset="./assets/${name}-light.svg">\n` +
  `  <img alt="${alt}" src="./assets/${name}-dark.svg" width="920">\n` +
  `</picture>`;

const picked = repos.slice(0, 6);

/* 项目清单：图片挂了也读得到的纯文本表 */
const projectRows = picked
  .map((r, i) => `| ${i + 1} | **[${r.name}](${r.url})** | ${r.language || '—'} | ${pitchOf(r)} |`)
  .join('\n');

const readme = `<div align="center">

${dual('hero', `${owner} — local-first tooling for AI coding agents`)}

</div>

---

## 现在在做什么

给 AI 编码助手造**本地工具**。不是又一个 API 封装，而是那些你必须自己写一遍的东西：让 agent 读得到、跑得久、看得见、用得顺手。

- **检索要能落地** —— 中文查询走国内引擎融合，英文走国际链，RRF 交叉校验，不要 key
- **作业要能跑久** —— 一次 MCP 调用被截断在 10 秒，那就把它变成后台跑几小时的作业
- **配额要能看见** —— 四家 API 的剩余额度从官方数据源读出来，放在托盘上
- **纯文本模型要看得见** —— 给 DeepSeek / GLM 这类模型补一层视觉

所有项目 **MIT 许可**、**中英双语文档**、**Windows 上实测过**。

---

## 精选开源

<div align="center">

${dual('projects', 'Selected open source projects')}

</div>

| # | 项目 | 语言 | 一句话 |
|:-:|---|---|---|
${projectRows}

<details>
<summary>全部 ${totals.publicRepos} 个公开仓库</summary>

<br>

${repos
  .map((r) => `- **[${r.name}](${r.url})** \`${r.language || '—'}\` — ${pitchOf(r)}`)
  .join('\n')}

</details>

---

## 技术栈

<div align="center">

${dual('tools', 'Tech stack')}

</div>

---

## 数据

<div align="center">

${dual('stats', 'Contribution graph and key metrics')}

</div>

<sub>${contribution.totalCommits} 次提交 · ${totals.publicRepos} 个公开仓库 · 合计 ${totals.stars} star · 每日由 GitHub Actions 自动更新</sub>

---

<div align="center">

<a href="https://github.com/${owner}?tab=followers"><img src="${BADGE}/followers-follow-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Follow"></a>
<a href="https://github.com/${owner}?tab=repositories"><img src="${BADGE}/repositories-${totals.publicRepos}-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Repositories"></a>
<a href="https://github.com/${owner}?tab=stars"><img src="${BADGE}/stars-${totals.stars}-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Stars"></a>
<img src="${VISITORS}" alt="Profile views">

<br><br>

<sub>Issues、PR、讨论都欢迎。中文英文都行。</sub>

</div>
`;

writeFileSync(resolve(ROOT, 'README.md'), readme, 'utf8');
console.log(`✓ README.md (${(Buffer.byteLength(readme) / 1024).toFixed(1)} KB, ${readme.split('\n').length} 行)`);
