<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/hero-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/hero-light.svg">
  <img alt="awslew — local-first tooling for AI coding agents" src="./assets/hero-dark.svg" width="640">
</picture>

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

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/projects-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/projects-light.svg">
  <img alt="Selected open source projects" src="./assets/projects-dark.svg" width="640">
</picture>

</div>

共 9 个公开仓库：

- `continuity-orchestrator` TypeScript · Pro：Chat 插件直接读改本机项目；Plus 目标：Codex 与网页 ChatGPT 接力（真实接力未验收）。
- `codex-job-orchestrator` TypeScript · 主会话留额度做决策；简单执行与复杂推理按能力分给三条 agent 路径。
- `codex-auto-resume-trio` TypeScript · Codex 因额度停工？重置后自动续跑同一个会话，后台可查看状态。
- `webgpt-drive` JavaScript · 本地 agent 遇到难题时，用已登录的 ChatGPT 网页版求助或生图，不另付 API 费。
- `ds-vision-kit` Python · 纯文本 agent 看不懂截图或图表？转成结构化文字，让原 agent 继续做事。
- `web-search-mcp` JavaScript · agent 没有搜索 API key？多引擎查可靠资料并抽取可读正文。
- `apiquota-dashboard` Python · 多个 AI 服务额度散在各处？托盘一页看余额和限额，长任务前心里有数。
- `screenshot-paste-assistant` Python · Win+Shift+S 截图后，在文件夹 Ctrl+V 直接得到图片文件。
- `lottery-one-pick` Python · 大乐透每期只留 1 注：按排除号随机筛选、保存记录、开奖对账；不预测中奖。

---

## 技术栈

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/tools-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/tools-light.svg">
  <img alt="Tech stack" src="./assets/tools-dark.svg" width="640">
</picture>

</div>

---

<div align="center">

<a href="https://github.com/awslew?tab=followers"><img src="https://img.shields.io/badge/followers-follow-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Follow"></a>
<a href="https://github.com/awslew?tab=repositories"><img src="https://img.shields.io/badge/repositories-9-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Repositories"></a>
<a href="https://github.com/awslew?tab=stars"><img src="https://img.shields.io/badge/stars-9-2F81F7?style=flat-square&logo=github&logoColor=white" alt="Stars"></a>
<img src="https://komarev.com/ghpvc/?username=awslew&color=2F81F7&style=flat-square&label=PROFILE+VIEWS" alt="Profile views">

<br>

<sub>46 commits · 9 repos · 每日由 GitHub Actions 自动更新</sub>

</div>
