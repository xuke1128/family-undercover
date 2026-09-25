# 发布文档：家庭卧底派对（family-undercover）

> 归档注记：本文为项目文档的入仓镜像（2026-09-25 复制自工作区归档稿 `docs/archive/family-undercover-run1-20260921/05-release.md`）；正文中的 `docs/…` 路径为撰写时工作区共享文档路径，非本仓库 `docs/` 结构，本仓库文档索引见 [README.md](README.md)。

- 发布与运维：App-Dev-Team 发布与运维 agent（release-ops）
- 当前版本：**v0.2.0**（2026-09-21 发布，Release Notes 见 §1）；历史版本 v0.1.0（同日首发，Release Notes 见 §2）
- 门禁依据：`docs/04-test-report.md` **通过态**——v0.2.0 回归验收（报告 §8）：`npm run build` / `npm test` **73 用例** / `npm run lint` 全绿、0 阻断问题（v0.1.0 首轮：70 用例全绿，US1-US10 中 9 通过、US9 含 1 项人工核验无法验证、5 项次要问题）
- 项目目录：`apps/family-undercover/`（自包含，即未来 GitHub 仓库根目录）
- 部署形态：**纯静态产物 `dist/`**（Vite `base: './'` 相对路径），无后端、无数据库、无密钥

---

## 1. Release Notes · v0.2.0（2026-09-21）

### 1.1 一句话摘要

玩法提速版：删掉 App 内的描述轮——全员看完词**直接进入秘密投票**，平票**全员直接重投一次**；「甜妈」头像年轻化为 30 岁甜美风。流程更短、规则更简单，孩子也更容易上手。

### 1.2 变更明细（两条用户可感变化）

1. **删除描述环节，看词后直接投票（`feat(game)`，`33f0b16`）**
   - 全员看词完成后不再由 App 逐人引导「一句话描述」，直接进入逐人秘密投票；家人面对面自由交流（不说出词语本身即可），节奏自定
   - 平票处理同步简化：首投平票 → **全员直接重投一次（可换票）** → 仍平票则本轮无人出局（原为平票者加赛补述后重投）
   - 实现面：状态机移除 describe 相位、删除 `DescribeView` 视图及其样式（视图 12 → 11）、玩法说明（HowToPlaySheet）/文案（copy.ts）/README 玩法速览与 Roadmap 同步（移除「描述发言计时器」规划）
   - 测试面：machine / 冒烟 / 防偷看 / 平票兜底用例对齐新流程，新增 `qa.regression-v020.test.tsx` 回归 3 例
2. **「甜妈」头像年轻化（`feat(avatar)`，`68859a4`）**
   - 原创 SVG 重绘为 30 岁左右年轻甜美女性形象：栗棕双马尾长卷发（发梢外卷高光）+ 粉色蝴蝶结发圈、放大明亮双眼（双高光）+ 腮红 + 甜美笑容、粉上衣配白领结
   - 仍为本项目原创矢量绘制，不含版权角色元素（合规基线不变，`docs/04-test-report.md` §5.1）

### 1.3 质量证据（发布前 release-ops 复跑，2026-09-21）

- `npm run build` exit 0：dist 产物完整，JS 274.83 kB（gzip 85.37 kB）/ CSS 22.79 kB
- `npm test`：**15 个文件 / 73 个用例全绿**（v0.1.0 的 70 例 + 回归新增 3 例）
- `npm run lint`：0 error / 0 warning
- `npm run preview`：`http://localhost:4173/` HTTP 200，HTML 含 `lang="zh-CN"`
- 门禁依据：`docs/04-test-report.md` §1 最新结论 + §8 v0.2.0 回归验收——通过态，无阻断问题

### 1.4 升级说明（从 v0.1.0 → v0.2.0）

- **纯静态产物，直接重新部署即可**：GitHub Pages push `main` 自动重新构建发布，或 Vercel 自动部署；**无任何数据迁移**
- **localStorage 战绩向后兼容不受影响**：战绩按版本化 key 存取且本次未改 schema，v0.1.0 存量排行榜 / 「再来一局」连局数据升级后照常可用
- 老玩家注意两点玩法变化：没有描述轮了（看完词直接投票）；平票是全员重投一次（不再是平票者加赛）

### 1.5 git 与 tag

- 本次 3 笔新提交：`33f0b16 feat(game)` / `68859a4 feat(avatar)` / `7f53915 chore(release): 0.2.0`（详见 §3）
- 本地 annotated tag **`v0.2.0`** 打在 HEAD（`7f53915`）；**未 push、未建远程**（用户未授权任何远程操作）
- v0.2.0 无新增发布工程文件，仅 package.json / package-lock.json 版本同步（0.1.0 → 0.2.0）

---

## 2. Release Notes · v0.1.0（首个开源版本，历史存档）

### 2.1 一句话摘要

一台手机传着玩的合家欢「谁是卧底」：免下载免登录、断网可玩（访问过一次后）、儿童适宜词库 + 原创萌系头像，5 到 50 岁一秒上手。纯前端静态单页（Vite + React 19 + TS，运行时依赖仅 react / react-dom）。

### 2.2 功能清单（M1-M9 全部落地）

- **开箱即玩（US1）**：打开即玩，无下载 / 注册 / 授权 / 广告；设置页默认预填 4 位家人可直接开局；零网络请求 + Service Worker 离线缓存
- **局前设置（US2）**：改名 / 换头像 / 删除 / 添加；简单模式 3-6 人（默认）、普通模式 3-12 人；昵称与头像唯一性校验；🎲 一键随机头像
- **传机看词防偷看（US3）**：看词须本人确认「是我」，隐藏后词立即消失且不可回看；局内无返回导航；刷新作废本局
- **阵营发词（US4）**：3-7 人 1 卧底、8-12 人 2 卧底（简单恒 1）；平民同词、卧底相近词；连局自动避重
- **描述轮引导（US5）**：按存活顺序轮转 + 进度提示；简单模式句式卡；出局者不参与
- **秘密投票（US6）**：逐人交接确认后投票，候选不含自己与出局者；全员投完公示得票与「谁投谁」明细
- **出局揭晓与推进（US7）**：两段式翻牌亮身份与词；平票两段处理（加赛重投 → 仍平无人出局）；3 轮无人出局兜底重开（二次确认）
- **战绩与连局（US8）**：获胜阵营（含已出局者）+1 胜、全体 +1 局；排行榜按胜场 → 胜率；「再来一局」沿用名单换新词；清空战绩二次确认
- **简单模式默认（US9）**：儿童词库 + 固定 1 卧底 + 3-6 人 + 短文案；「6 岁儿童真机核验」为人工项未执行（见 2.4）
- **词库放心（US10）**：110 对（5 分类 × 2 难度），逐条人工审核 + 自动化黑名单兜底；清单即代码可 review

### 2.3 内容与版权合规

- 4 个头像为本项目**原创 SVG 矢量绘制**（暖爸 / 甜妈 / 像素小子 / 粉兜兔），通用几何图形，**不含任何版权角色形象与商标**（全仓 grep 0 匹配，测试报告 §5.1）
- 「动画角色」分类词对均为原创角色原型（公主 / 巫师 / 忍者等）
- 开源协议：**MIT**（LICENSE，Copyright (c) 2026 App-Dev-Team Contributors）

### 2.4 已知问题（5 项次要，均不阻断；v0.2.0 未处理，顺延至 v0.3.0）

| # | 问题 | 影响 |
|---|---|---|
| 1 | 辅助文字 `--ink-2 #8A786A` 对比度 4.00:1（验收线 4.5:1） | 弱视用户看辅助说明略吃力 |
| 2 | 危险按钮白字 on #FF6B6B 2.78:1、身份卡渐变亮端白字 1.82-2.79:1 | 仅 Modal 内「清空/确认重开」与身份卡亮端，主按钮满足大字 3:1 |
| 3 | P4「隐藏」过渡反馈（确认条 + 🙊 盖章动效）未实现 | 观感缺失；防偷看硬约束不受影响且有测试证据 |
| 4 | `theme-color #FF8A3D` 与主 token `#F0633F` 不一致 | 仅浏览器状态栏底色 |
| 5 | 真机人工项未执行：6 岁儿童核验、真机断网实测 | 非缺陷；建议发布前由用户做一次真机冒烟 |

### 2.5 质量证据（v0.1.0 发布时点）

`npm run lint`（0 error / 0 warning）｜`npm run build`（exit 0，dist：index.html + JS 275.84 kB / gzip 85.61 kB + CSS 23.59 kB + favicon + sw.js）｜`npm test`（14 文件 / 70 用例全绿）｜`npm run preview`（HTTP 200）。发布前 release-ops 已在本机全量复跑一遍，结果一致。

---

## 3. 版本与仓库状态（v0.2.0 发布后）

- 版本：**v0.2.0**（package.json / package-lock.json 已同步，`npm install --package-lock-only` 仅变更根包版本两行；沿用 0.x 开发阶段语义）
- git：本地仓库（默认分支 `main`，无远程），v0.2.0 后共 **6 笔 Conventional Commits**：
  1. `chore: 初始化工程脚手架与工具链配置`
  2. `feat: 家庭卧底派对 MVP 玩法与界面基线`
  3. `chore: 开源就绪（README/LICENSE/CI/贡献模板）与 Pages 部署工作流`（tag `v0.1.0`）
  4. `feat(game): 看词后直接投票，平票全员重投一次（移除描述环节）`（`33f0b16`）
  5. `feat(avatar): 甜妈头像年轻化为 30 岁甜美风`（`68859a4`）
  6. `chore(release): 0.2.0`（`7f53915`）
  - v0.2.0 拆分理由：玩法修订与头像重绘是两条独立用户可感特性（不同 scope，可独立 review / revert / cherry-pick）；版本号与 lockfile 属发布元数据，独立成 `chore(release)` 使 tag 恰好落在发布提交上，与后续发版节奏一致
- tag：本地 annotated tag **`v0.2.0`** 打在 HEAD（`7f53915`）；历史 tag `v0.1.0`（`d767131`）
- 提交身份：沿用仓库级占位身份 `App-Dev-Team Release Ops <release-ops@app-dev-team.local>`（全局 git 身份未配置）；push 前建议改写为用户本人身份（见 §7）
- **远程：无**（未配置任何 remote，未 push——遵守授权红线）

---

## 4. 部署步骤（两种静态托管路径，二选一）

> 共同前置：代码在 `apps/family-undercover/` 本地仓库中；环境变量为**空**（零配置）；无需数据库 / 密钥 / 域名证书操作。

### 4.1 路径 A：GitHub Pages（推荐，零成本）

1. 用户授权后创建 GitHub 仓库（建议 public，仓库名如 `family-undercover`），push `main` 与 tag（`v0.1.0` / `v0.2.0`）
2. 仓库 **Settings → Pages → Build and deployment → Source 选 "GitHub Actions"**（一次性）
3. push 到 `main` 会自动触发 `.github/workflows/deploy-pages.yml`：npm ci → build → 发布 `dist/`；另配 `workflow_dispatch` 可手动触发
4. 访问 `https://<user>.github.io/<repo>/` 验证（`base './'` 已兼容子路径）
5. HTTPS 由 GitHub Pages 自动提供

### 4.2 路径 B：Vercel

1. Vercel 控制台 Import Git Repository（需先完成 §4.1 第 1 步的建仓与 push）
2. Framework Preset 选 **Vite**（Build Command `npm run build`、Output Directory `dist` 自动识别），**无需 vercel.json、无需任何环境变量**
3. 部署完成后自动分配 `*.vercel.app` 域名（HTTPS 自动）；生产域名可在控制台绑定自定义域
4. 每次 push `main` 自动重新部署

### 4.3 本地已验证

- `npm run build` 复跑 exit 0，`dist/` 产物完整（index.html / assets JS+CSS / favicon.svg / sw.js）；v0.2.0 发布前 release-ops 复跑：JS 274.83 kB（gzip 85.37 kB）/ CSS 22.79 kB
- `npm run preview` 伺服 `http://localhost:4173/` 返回 HTTP 200，HTML 含 `lang="zh-CN"` 与 viewport meta

---

## 5. 上线检查清单

| 检查项 | 状态 | 说明 |
|---|---|---|
| 环境变量 / 密钥 | 无需 | 零环境变量（`.env.example` 已注明）；仓库无任何真实密钥 |
| 构建产物 | 本地已验证 | dist 完整；CI（Node 22/24）将复验 lint/build/test |
| HTTPS | 平台自动 | Pages / Vercel 均自动提供 |
| 健康检查 | 不适用 | 纯静态站点无服务端；等价物 = 首页 HTTP 200 + 关键界面走查 |
| 日志 / 监控 | 不适用 | 零后端、零网络请求；平台侧访问日志可在控制台查看 |
| 备份 | 不适用 | 无服务端数据；用户战绩仅存本机 localStorage（设计如此，PRD §8） |
| 离线能力 | 已内置 | SW cache-first；首次打开需网络（平台固有限制，已写明于 README） |
| 真机冒烟 | 待用户执行 | 发布前建议真机（iOS Safari / Android Chrome）走一局全流程 |

---

## 6. 回滚预案

静态站点回滚 = **回退 `dist/` 重新部署**，无数据迁移风险：

- **GitHub Pages**：`git revert <坏提交>`（或 `git reset` 后 force push，个人仓库可接受）→ push `main` 自动重新部署；历史部署可在仓库 Environments → github-pages 查看与重部署
- **Vercel**：控制台 Deployments 列表一键 **Rollback / Promote** 到任意历史部署，秒级生效
- **极端情况**（部署工作流本身故障）：临时停用 Pages 的 Actions Source 或在 Vercel 断开 Git 连接，站点保持最后稳定版
- 数据面：无服务端数据，回滚不影响玩家本机战绩（localStorage 按版本化 key 存取，旧前端可正常读取）

---

## 7. 需用户人工完成的事项

> 以下均涉及远程 / 公网操作或真实身份，**未经授权 release-ops 不执行**。

1. **开源到 GitHub**：确认仓库名与可见性（建议 `family-undercover` / public）后授权；届时先检查 `gh auth status`，再创建仓库并 push `main` + tag（`v0.1.0` / `v0.2.0`）
2. **改写提交身份**（可选但建议）：`git config user.name/user.email` 设置本人身份后 `git rebase -r --root --exec 'git commit --amend --reset-author --no-edit'` 重写全部提交（当前为占位身份；改写后历史哈希变化，tag 需删除重打）
3. **选择部署路径**：GitHub Pages（建仓后把 Settings → Pages Source 设为 GitHub Actions）或 Vercel（Import 后零配置）
4. **真机冒烟**（发布前建议）：真机打开、开一局全流程、断网重开验证 SW 离线
5. **截图补充**：README「截图与演示」节为占位，建议真机截 4-6 张关键界面补入
6. v0.3.0 修复排期：§2.4 五项次要问题（对比度 2 项建议优先）

---

## 8. v0.1.0 发布产物清单（历史存档）

| 文件 | 说明 |
|---|---|
| `README.md` | 重写为完整开源 README（亮点/截图占位/快速开始/测试/部署/Roadmap 含已知问题/MIT 与版权说明） |
| `LICENSE` | 新增，MIT（App-Dev-Team Contributors） |
| `.gitignore` | 修复：`.env.*` 规则会误伤 `.env.example`，已加 `!.env.example` 放行 |
| `.env.example` | 核对无误（零环境变量占位说明） |
| `CONTRIBUTING.md` | 新增：开发命令 + 内容合规 / 版权 / 纯前端 / 防偷看四条红线 + 提交规范 |
| `.github/ISSUE_TEMPLATE/*.md`、`.github/PULL_REQUEST_TEMPLATE.md` | 新增模板 |
| `.github/workflows/ci.yml` | 新增 CI：Node 22/24 矩阵，npm ci → lint → build → test |
| `.github/workflows/deploy-pages.yml` | 新增 Pages 部署工作流（push main 自动构建发布） |
| `package.json` / `package-lock.json` | 版本 1.0.0 → 0.1.0 |
| git | 本地 init（main）+ 3 笔 Conventional Commits + 本地 tag v0.1.0，无远程 |

业务代码（`src/`、`public/`、`index.html`）与 `docs/01-04` 文档：**未改动**。

## 9. Release Notes · v0.3.0（2026-09-25）

- 门禁依据：测试报告 §9 v0.3.0 回归验收——**15 文件 / 81 用例全绿**（v0.2.0 的 73 例 + 新增 8 例），`npm run build` / `npm test` / `npm run lint` 全绿，0 阻断。
- 玩法变更（设计权威：`family-undercover-design-addendum-v030.md`）：
  1. **出局只亮身份不亮词**：出局揭晓页仅展示身份（卧底/平民），词语的唯一公开时机为终局结算页，降低中途剧透与身份反推。
  2. **顺序随机**：看词顺序每局随机；每轮投票顺序该轮重排（平票重投沿用本轮序、出局者移除；内部固定随机种子，可复现可测试）。
- 升级说明：纯前端静态产物，**重新构建部署 `dist/` 即完成升级**；战绩存于浏览器 localStorage 且结构向后兼容，老用户战绩无损保留。
- 文档备份：项目文档已备份入仓（`apps/family-undercover/docs/`：PRD / 设计增补 / 技术方案 / 测试报告 / 发布文档 / 13 张界面图），v0.3.0 起以仓库内 `docs/` 为准。
- 发布记录：提交 `87fa767`（feat(game)）+ `b609b73`（chore(release): 0.3.0），tag `v0.3.0` 已推送 origin；CI 与 Deploy to GitHub Pages 均 success（run 36151834843 / 36151834856），线上 https://xuke1128.github.io/family-undercover/ 返回 200，线上 JS bundle 与本地 `dist/assets/index-Bfu1DRT5.js` MD5 一致（`6a7234033fed35cb335374d5a585bfac`）。
