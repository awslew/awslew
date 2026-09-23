#!/usr/bin/env node
/**
 * 采集 awslew 的 GitHub 公开数据，落成 data.json 供 make-assets.mjs 生成 SVG。
 *
 * 两种运行方式自动切换：
 *  - 本地：走 gh CLI（复用已登录凭据，无需自己配 token）
 *  - CI：走 GitHub REST / GraphQL API（需要 GITHUB_TOKEN 或 GH_TOKEN）
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OWNER = process.env.PROFILE_OWNER || 'awslew';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const API = 'https://api.github.com';

/* ── 传输层 ─────────────────────────────────────────────── */

function ghCli(args) {
  return JSON.parse(
    execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: process.env })
  );
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(path.startsWith('http') ? path : API + path, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      'User-Agent': 'profile-readme-builder',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

/** 与账号同名的仓库 = 承载本 README 的主页仓库，不算「项目」 */
const isProfileRepo = (r) => r.name === OWNER;

/** 统一取数接口：CI 用 API，本地用 gh */
const viaApi = Boolean(TOKEN);
const getUser = () => (viaApi ? apiFetch(`/users/${OWNER}`) : ghCli(['api', `users/${OWNER}`]));

async function getRepos() {
  if (!viaApi) {
    return ghCli([
      'repo', 'list', OWNER, '--limit', '200', '--source', '--visibility', 'public', '--json',
      'name,description,stargazerCount,forkCount,primaryLanguage,url,homepageUrl,repositoryTopics,pushedAt,createdAt,isFork,licenseInfo',
    ]);
  }
  // CI：分页拉取 public repos，剔除 fork，再补齐 topics / license
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const chunk = await apiFetch(`/users/${OWNER}/repos?per_page=100&page=${page}&type=owner&sort=pushed`);
    if (!chunk.length) break;
    for (const r of chunk) {
      if (r.fork || r.private) continue;
      out.push({
        name: r.name,
        description: r.description,
        stargazerCount: r.stargazers_count,
        forkCount: r.forks_count,
        primaryLanguage: r.language ? { name: r.language } : null,
        url: r.html_url,
        homepageUrl: r.homepage || '',
        repositoryTopics: (r.topics || []).map((name) => ({ name })),
        pushedAt: r.pushed_at,
        createdAt: r.created_at,
        isFork: r.fork,
        licenseInfo: r.license ? { spdxId: r.license.spdx_id } : null,
      });
    }
  }
  return out;
}

const CONTRIB_QUERY = `{
  user(login: "${OWNER}") {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount weekday } }
      }
    }
  }
}`;

async function getContributions() {
  if (viaApi) {
    const json = await apiFetch('/graphql', { method: 'POST', body: { query: CONTRIB_QUERY } });
    if (json.errors) throw new Error('graphql: ' + JSON.stringify(json.errors));
    return json.data.user.contributionsCollection;
  }
  const json = ghCli(['api', 'graphql', '-f', `query=${CONTRIB_QUERY}`]);
  return json.data.user.contributionsCollection;
}

async function getTotalCommits() {
  try {
    if (viaApi) {
      const r = await apiFetch(`/search/commits?q=author:${OWNER}&per_page=1`);
      return r.total_count;
    }
    return ghCli(['api', `search/commits?q=author:${OWNER}&per_page=1`, '--jq', '.total_count']);
  } catch {
    return 0; // 由调用方回退
  }
}

/* ── 主流程 ─────────────────────────────────────────────── */

const daysBetween = (a, b) => Math.round((b - a) / 86400000);

async function main() {
  console.log(`transport: ${viaApi ? 'REST/GraphQL API (token)' : 'gh CLI'}`);

  console.log('→ user');
  const raw = await getUser();
  const user = {
    login: raw.login,
    name: raw.name,
    bio: raw.bio,
    company: raw.company,
    blog: raw.blog,
    location: raw.location,
    twitter_username: raw.twitter_username,
    avatar_url: `https://avatars.githubusercontent.com/u/${raw.id}?v=4`,
    followers: raw.followers,
    following: raw.following,
    public_repos: raw.public_repos,
    created_at: raw.created_at,
  };

  console.log('→ repos');
  const repos = (await getRepos()).filter((r) => !r.isFork && !isProfileRepo(r));

  // 语言分布按仓库数计（比字节数更能反映「在做什么」）
  const langCount = new Map();
  for (const r of repos) {
    const l = r.primaryLanguage?.name || 'Other';
    langCount.set(l, (langCount.get(l) || 0) + 1);
  }
  const languages = [...langCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  console.log('→ contributions');
  const cal = await getContributions();

  const allDays = cal.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  // 最近 53 周，对齐 GitHub 原生网格宽度
  const cutoff = new Date(Date.now() - 7 * 53 * 86400000);
  const days = allDays.filter((d) => new Date(d.date + 'T00:00:00Z') >= cutoff);

  console.log('→ commit search');
  const totalCommits = (await getTotalCommits()) || cal.totalCommitContributions;

  const data = {
    generatedAt: new Date().toISOString(),
    owner: OWNER,
    user,
    repos: repos
      .sort((a, b) => b.stargazerCount - a.stargazerCount || new Date(b.pushedAt) - new Date(a.pushedAt))
      .map((r) => ({
        name: r.name,
        description: r.description,
        stars: r.stargazerCount,
        forks: r.forkCount,
        language: r.primaryLanguage?.name || null,
        url: r.url,
        homepage: r.homepageUrl || null,
        topics: (r.repositoryTopics || []).map((t) => t.name),
        license: r.licenseInfo?.spdxId || null,
        pushedAt: r.pushedAt,
        createdAt: r.createdAt,
      })),
    languages,
    contribution: {
      yearTotal: cal.contributionCalendar.totalContributions,
      yearCommits: cal.totalCommitContributions,
      prs: cal.totalPullRequestContributions,
      issues: cal.totalIssueContributions,
      reposContributed: cal.totalRepositoriesWithContributedCommits,
      totalCommits,
      activeDaysInWindow: days.filter((d) => d.contributionCount > 0).length,
      maxPerDay: Math.max(1, ...days.map((d) => d.contributionCount)),
      days,
    },
    totals: {
      publicRepos: repos.length,
      stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
      forks: repos.reduce((s, r) => s + r.forkCount, 0),
      accountAgeDays: daysBetween(new Date(user.created_at), new Date()),
    },
  };

  const out = resolve(ROOT, 'data.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(
    `✓ ${data.totals.publicRepos} repos · ${data.totals.stars} stars · ` +
    `${data.contribution.yearTotal} contribs this year · ${data.contribution.totalCommits} commits all-time`
  );
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
