#!/usr/bin/env node
/**
 * 由 data.json 生成 README.md。
 *
 * 设计原则：
 *  1. 主视觉走仓库内自包含 SVG（相对路径），不依赖任何第三方卡片服务 → 永不碎图
 *  2. 关键文字信息同时以 Markdown 文本给出 → 可被搜索引擎 / AI 检索到，且图片挂了也不丢信息
 *  3. 针对 GitHub 主页**窄栏**（实测约 397px）排版：宽度 640 的图 + 不用宽表格
 *  4. 不重复 GitHub 自己已经展示的贡献热力图
 *  5. 唯一的第三方图片是小尺寸社交徽章与访问计数
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data.json'), 'utf8'));
const PITCH = JSON.parse(readFileSync(resolve(HERE, 'project-pitch.json'), 'utf8'));
const { owner, repos, totals, contribution } = data;

/** 项目一句话定位（与 assets 生成共用 scripts/project-pitch.json） */
const pitchOf = (repo) => PITCH[repo.name] || repo.description || '';

const BADGE = 'https://img.shields.io/badge';
const VISITORS = `https://komarev.com/ghpvc/?username=${owner}&color=2F81F7&style=flat-square&label=PROFILE+VIEWS`;
const IMG_W = 640; // 与 SVG 设计宽度一致，避免被缩放糊掉

/** 双主题图片：<picture> 按访客配色自动切 */
const dual = (name, alt) =>
  `<picture>\n` +
  `  <source media="(prefers-color-scheme: dark)" srcset="./assets/${name}-dark.svg">\n` +
  `  <source media="(prefers-color-scheme: light)" srcset="./assets/${name}-light.svg">\n` +
  `  <img alt="${alt}" src="./assets/${name}-dark.svg" width="${IMG_W}">\n` +
  `</picture>`;

/* 项目清单：图片之外再给一份纯文本，图片挂了 / 爬虫 / AI 检索都读得到。
   用列表而不是宽表格 —— 窄栏里 4 列表格会把每行挤成 5 行高。
   注意这里不再重复链接和定位（上面卡片已有），只补机器可读的完整索引。 */
const projectList = repos
  .map((r) => `- \`${r.name}\` ${r.language || '—'} · ${pitchOf(r)}`)
  .join('\n');

const readme = `<div align="center">

${dual('hero', `${owner} — local-first tooling for AI coding agents`)}

</div>

---

## 现在在做什么

我做的是帮 AI 编码工具跨过实际使用障碍的本地项目。每个仓库先回答“它能帮你解决什么事”：

- **想在 Chat 里直接处理本机项目** —— [continuity-orchestrator](https://github.com/awslew/continuity-orchestrator) 的 Pro 模式让 Chat 端插件按你的指令读取、修改并测试本地代码；需要明确开启本地访问。
- **Codex 额度快用完，任务还没做完** —— 同仓库的 Plus 模式目标是交给还有额度的网页版 ChatGPT 继续，等 Codex 恢复后回到原线程。真实网页接力尚未端到端验收。
- **想把 Codex 额度用在关键判断上** —— [codex-job-orchestrator](https://github.com/awslew/codex-job-orchestrator) 的三条任务路径按职责分工：主会话定方案并验收，简单执行与复杂推理交给合适的 agent。
- **额度重置时人不在电脑前** —— [codex-auto-resume-trio](https://github.com/awslew/codex-auto-resume-trio) 守护选定的 Codex 会话，确认因额度中断后，在恢复时继续同一个会话。
- **agent 要看图、查资料或求助网页版 ChatGPT** —— 视觉、搜索与网页会话工具让原任务继续进行；额度看板和截图助手解决日常操作中的小麻烦。

项目文档以中英双语为主；许可与支持平台请以各仓库说明为准。

---

## 精选开源

<div align="center">

${dual('projects', 'Selected open source projects')}

</div>

共 ${repos.length} 个公开仓库：

${projectList}

---

## 技术栈

<div align="center">

${dual('tools', 'Tech stack')}

</div>

---

<div align="center">

<a href="https://github.com/${owner}?tab=followers"><img src="${BADGE}/followers-follow-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Follow"></a>
<a href="https://github.com/${owner}?tab=repositories"><img src="${BADGE}/repositories-${totals.publicRepos}-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Repositories"></a>
<a href="https://github.com/${owner}?tab=stars"><img src="${BADGE}/stars-${totals.stars}-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Stars"></a>
<img src="${VISITORS}" alt="Profile views">

<br>

<sub>${contribution.totalCommits} commits · ${totals.publicRepos} repos · 每日由 GitHub Actions 自动更新</sub>

</div>
`;

writeFileSync(resolve(ROOT, 'README.md'), readme, 'utf8');
console.log(`✓ README.md (${(Buffer.byteLength(readme) / 1024).toFixed(1)} KB, ${readme.split('\n').length} 行)`);
