<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/hero-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/hero-light.svg">
  <img alt="awslew — local-first tooling for AI coding agents" src="./assets/hero-dark.svg" width="640">
</picture>

</div>

---

## 现在在做什么

给 AI 编码助手造**本地工具**。不是又一个 API 封装，而是那些你必须自己写一遍的东西：让 agent 读得到、跑得久、看得见、用得顺手。

- **检索要能落地** —— 中文查询走国内引擎融合，英文走国际链，RRF 交叉校验，不要 key
- **作业要能跑久** —— 一次 MCP 调用被截断在 10 秒，那就把它变成后台跑几小时的作业
- **配额要能看见** —— 从官方数据源读取 API 余额与订阅使用限额，放在托盘上
- **纯文本模型要看得见** —— 给 DeepSeek / GLM 这类模型补一层视觉

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

- `webgpt-drive` JavaScript · 让编码 agent 复用已登录的 ChatGPT 网页会话：问答、生图和参考图编辑。
- `apiquota-dashboard` Python · Windows 托盘看 DeepSeek/OpenRouter 余额及 OpenCode Go/Codex 使用额度。
- `lottery-one-pick` Python · 大乐透每期随机筛出一注并开奖对账；形态过滤，不预测中奖。
- `continuity-orchestrator` TypeScript · 让 MCP 客户端读取本地项目；可选实验性 Pro 模式支持编辑、快照和测试。
- `ds-vision-kit` Python · 给纯文本 agent 接入视觉模型，处理 OCR、图表、UI 截图等图像任务。
- `screenshot-paste-assistant` Python · 让 Windows 截图可直接 Ctrl+V 粘贴为文件，且保留普通图片粘贴。
- `codex-auto-resume-trio` TypeScript · Codex 因额度停下后，重置时续跑原会话；附状态页、项目总览与配额看板。
- `codex-job-orchestrator` TypeScript · 让 Codex 通过 MCP 派发 Claude Code 或 DSH 长作业，后台运行并等待结果。
- `web-search-mcp` JavaScript · 给 AI 编码助手接入多引擎联网搜索与正文抽取，无需 API key。

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

<sub>136 commits · 9 repos · 每日由 GitHub Actions 自动更新</sub>

</div>
