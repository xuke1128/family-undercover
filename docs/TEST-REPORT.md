# 测试报告：家庭卧底派对（family-undercover）

> 归档注记：本文为项目文档的入仓镜像（2026-09-25 复制自工作区归档稿 `docs/archive/family-undercover-run1-20260921/04-test-report.md`）；正文中的 `docs/…` 路径为撰写时工作区共享文档路径，非本仓库 `docs/` 结构，本仓库文档索引见 [README.md](README.md)。

- 测试人：QA（App-Dev-Team 测试 agent，独立于开发）
- 日期：2026-09-21
- 评审输入：`docs/01-prd.md`（§3 玩法规则 / M1-M9 / US1-US10 / §9 既定规则）、`docs/02-design.md` + `docs/mockups/`（14 张界面图）、`docs/03-tech-design.md`（任务拆解与验收命令）、`apps/family-undercover/` 全部源码
- 环境：macOS darwin 25.6.0 arm64 / Node v26.9.0 / npm 11.19.1 / Vite 7.3.6 / Vitest 3.2.7

---

## 1. 整体结论

**最新状态（2026-09-25，v0.3.0 回归验收后）：通过（passed = true）。** 验收命令全绿（`npm run build` / `npm test` / `npm run lint` 均 exit 0），测试套件 **15 个文件 / 81 个用例全绿**（v0.2.0 的 73 例 + QA 本次新增 1 例 + 开发为 v0.3.0 改写/新增 7 例）；两条玩法修订（① 出局揭晓只亮身份不亮词，词语唯一公开时机 = 终局结算页；② 看词顺序每局随机、每轮投票顺序该轮重排、平票重投沿用本轮序、出局者移除、固定种子可复现）在状态机/视图/文案/测试四个层面一致落地，断言忠实性抽查未发现弱化或删失，无阻断问题。详见文末 **§9「v0.3.0 回归验收（2026-09-25）」**。

**上一轮状态（2026-09-21，v0.2.0 回归验收）：通过（passed = true）。** 验收命令全绿（`npm run build` / `npm test` / `npm run lint` 均 exit 0），测试套件 **15 个文件 / 73 个用例全绿**（v0.1.0 的 70 例 + 回归新增 3 例）；同日两条用户修订（① 删除描述环节，看词后直接投票、平票全员直接重投一次；② 「甜妈」头像年轻化）在代码/文案/状态机/测试/设计同步五个层面一致落地，逐项验收通过，无阻断问题。详见 **§8「v0.2.0 回归验收（2026-09-21）」**（注意：§8 中 US6「出局页亮身份与词」的表述为 v0.2.0 时点规则下的验收记录，其「亮词」口径已被 §9-14 修订取代，以 §9 为准）。

以下为 v0.1.0 首轮验收记录（注：其 US1-US10 / M1-M9 / 14 张界面图为**修订前 PRD 编号口径**，描述环节删除后已由 PRD §9 第 12 条修订取代——US5 描述轮已删、后续编号前移、MVP 调整为 M1-M8；最新结论以本节与 §8 为准）：

**通过（passed = true）**。验收命令全部通过（build / test / lint 均 exit 0），测试套件 **14 个文件 / 70 个用例全绿**（含 QA 本次新增 5 个文件 12 个用例）；US1-US10 中 9 条**通过**，US9 的「6 岁儿童真机人工核验」与真机断网实测为**无法验证**（人工/真机项，非缺陷，且后者受 Web 平台固有限制并已记录于技术方案 §10-1）；未发现阻断级问题。次要问题 5 项见 §6，不构成发布阻断。

---

## 2. 测试范围与用例清单

### 2.1 既有用例（开发交付，58 个，QA 复核有效）

| 文件 | 用例数 | 覆盖 |
|---|---|---|
| `referee.test.ts` | 9 | 卧底数映射（3-7→1 / 8-12→2 / 简单恒 1）、胜负判定（§3.4 两条 + 1v1 死锁保护）、计分口径（§3.5） |
| `tally.test.ts` | 4 | 计票、唯一最高、平票判定、非法票防御 |
| `wordBank.test.ts` | 5 | ≥100 对、5 分类 × 2 难度、id 唯一、两词不同且 1-4 字、全库词不重复 |
| `storage.test.ts` | 6 | 版本化读写、损坏 JSON / 版本不符 / 非法档案回退、写入失败不抛出、计分累计、清空、排行排序 |
| `dealer.test.ts` | 6 | 简单恒 1 卧底且用 easy 词库、普通人数映射、阵营发词正确、近期词对避重、连玩 20 局随机性、注入 RNG 可复现 |
| `machine.test.ts` | 15 | 看词三态与守卫、投票守卫（投自己抛错）、3 人局全程、卧底追平即胜、下一轮推进、8 人 2 卧底局、出局者剔除、平票两段（含最多重投一次）、3 轮兜底与计数归零、REDEAL、相位不符动作幂等 |
| `setup.test.ts` | 9 | 人数上限/切换校验、名单校验（空/重/长/头像重复）、默认预填 4 人 4 原创头像、随机头像不冲突、头像库 54 个 |
| `app.smoke.test.tsx` | 2 | 4 人简单局 UI 全程（防偷看-描述-投票-公示-揭晓-结算-战绩入档-排行榜）、再来一局 |
| `setupBoundary.smoke.test.tsx` | 2 | 简单 6 人拦 + 一键切普通 + 名单保留 + 切回被拦 + 删减后可切；不足 3 人置灰 |

### 2.2 QA 本次新增（5 个文件 / 12 个用例，全部通过）

| 文件 | 用例 | 验证点 |
|---|---|---|
| `qa.wordbank.test.ts` | 5 | 词库恰 110 对（简单池 50 / 普通池 60）、分布恰为 5×(10+12)、id 规则 `<category>-<e|n><序号>` 与自身一致、儿童适宜黑名单兜底（无 酒/血/死/枪/赌/毒/色情 等要素、两词均为 1-4 个纯中文字符）、分类标签齐全 |
| `qa.setupui.test.tsx` | 2 | 普通模式加至 12 人后第 13 人被拦（按钮置灰 + 「最多 12 人」）；模式说明行不泄露卧底数量（02-design §7-1）；头像弹层 4 原创置顶 + 「共 50 个」emoji、他人占用置灰禁用、换出的头像释放可再选 |
| `qa.anticheat.test.tsx` | 1 | **防偷看结构性验证**：词仅在看词态 B 渲染（态 A / 描述 / 投票交接 / 选票 / 票型公示各屏均无词）；局内 P4-P7 无「回首页/返回」导航；投票候选不含自己；出局揭晓与终局按规则亮词（US7） |
| `qa.tie-fallback.test.tsx` | 2 | 平票两段流程 UI 全程（首投平票公告含票数 → 仅平票者加赛 + 「重新投票」标注 → 重投唯一最高出局 → 下一轮不含出局者）；重投仍平票 → 无人出局 → 下一轮；连续 3 轮无人出局 → M2 兜底弹层（前两轮不弹）→ 重开本局经 M1 二次确认 → 回看词页 `看词 1/4` 且档案为空（不计战绩） |
| `qa.leaderboard.test.tsx` | 2 | 排行榜按胜场降序/同胜场看胜率展示（含第 1 名标记）；卸载重挂载后战绩仍在（模拟关闭重开）；清空战绩二次确认（取消不生效、确认后回空态且 localStorage 档案清空） |

> 说明：QA 新增用例调试期间出现过 3 次失败，均为**测试自身编写错误**（黑名单误伤「酒店」、头像弹层默认分组未切换、投票驱动循环缺少交接确认 / 轮次标题含「（还剩 N 人）」后缀），修正的是测试驱动代码，**未放宽任何有效断言**，也未改动业务代码。

---

## 3. 验收命令与原始输出证据

命令目录：`apps/family-undercover/`（依赖已安装，`node_modules` 就绪）。

### 3.1 `npm run build`（tsc -b + vite build）→ **exit 0**

```
> family-undercover@1.0.0 build
> tsc -b && vite build

vite v7.3.6 building client environment for production...
✓ 61 modules transformed.
rendering chunks...
computing gzip chunks...
dist/index.html                   0.74 kB │ gzip:  0.49 kB
dist/assets/index-CmBxkYvi.css   23.59 kB │ gzip:  5.14 kB
dist/assets/index-BvHeOPde.js   275.84 kB │ gzip: 85.61 kB
✓ built in 302ms
```

### 3.2 `npm test`（vitest run）→ **exit 0**：14 文件 / 70 用例全过

```
 ✓ src/__tests__/referee.test.ts (9 tests)
 ✓ src/__tests__/tally.test.ts (4 tests)
 ✓ src/__tests__/wordBank.test.ts (5 tests)
 ✓ src/__tests__/storage.test.ts (6 tests)
 ✓ src/__tests__/dealer.test.ts (6 tests)
 ✓ src/__tests__/machine.test.ts (15 tests)
 ✓ src/__tests__/setup.test.ts (9 tests)
 ✓ src/__tests__/setupBoundary.smoke.test.tsx (2 tests)
 ✓ src/__tests__/app.smoke.test.tsx (2 tests)
 ✓ src/__tests__/qa.wordbank.test.ts (5 tests)
 ✓ src/__tests__/qa.setupui.test.tsx (2 tests)
 ✓ src/__tests__/qa.anticheat.test.tsx (1 test)
 ✓ src/__tests__/qa.tie-fallback.test.tsx (2 tests)
 ✓ src/__tests__/qa.leaderboard.test.tsx (2 tests)

 Test Files  14 passed (14)
      Tests  70 passed (70)
   Duration  2.75s
```

（Node 26 的 `localStorage` ExperimentalWarning 为技术方案 §10-5 已记录的已知现象，测试环境已在 `src/test/setup.ts` 用内存实现补齐，不影响判定。）

### 3.3 `npm run lint`（eslint .）→ **exit 0**，无任何输出（0 error / 0 warning）

### 3.4 `npm run preview`（补充走查）

`vite preview` 起服务后 `curl http://localhost:4173/` 返回 **HTTP 200**，HTML 含 `lang="zh-CN"`、viewport meta 与相对路径 favicon，生产构建可正常伺服。

---

## 4. 用户故事逐条验收（US1-US10）

| US | 结论 | 证据与说明 |
|---|---|---|
| **US1 开箱即玩** | **通过** | 打开 → P0 骢屏（700ms）→ P1 → 1 次点击「开始游戏」进 P2（≤2 步，`app.smoke` / `HomeView` 代码）；无下载/注册/授权/广告（源码零第三方脚本，运行时**零网络请求**：全仓 grep 仅 `public/sw.js:33` 的 SW cache-first 内部 fetch，缓存命中即离线）；设置页默认预填 4 人 + 4 原创头像（`setup.test` defaultRoster + `app.smoke`「玩家 4/6」）无需录入即可开局；断网可玩由「词库/规则内置 + SW 缓存 + 零网络代码」保证（代码层验证；**真机断网实测未执行**，见 §6-5） |
| **US2 建玩家选头像** | **通过** | 预填 4 人可改名/换头像/删除（`SetupView` 实现全交互）；删至 <3 人开局置灰 + 「还差 1 名玩家（至少 3 人）」（`setupBoundary.smoke`）；默认简单模式（radio aria-checked，`app.smoke`）；普通 3-12、简单上限 6：第 7 人不添加 + 横幅「简单模式最多 6 人」+ 一键切普通且名单保留、>6 人切回被拦、删减后可切（`setupBoundary.smoke`）；普通 12 人封顶「最多 12 人」（`qa.setupui`，单元层 `checkAddPlayer`）；昵称非空/不重复/≤8 字、头像不可重复（`setup.test` validateRoster + UI 禁用态）；头像库 54 = 4 原创 + 50 emoji（5 组×10，`setup.test` + `qa.setupui` 弹层数量标注）；一键随机头像（`randomizeAllAvatars` 互不重复，`setup.test`） |
| **US3 传机看词防偷看** | **通过** | 看词前必须「是我」确认（machine `PEEK_HIDE` 守卫：未确认时 `PEEK_HIDE` 无效，`machine.test`）；词仅在看词态 B 渲染、隐藏后立即从 DOM 消失（`app.smoke` + `qa.anticheat` 逐屏断言：态 A / 描述 / 投票交接 / 选票 / 票型公示均无词）；局内无返回导航（`qa.anticheat` 断言 P4-P7 无「回首页/返回」按钮，代码层 GameView 无 topbar）；刷新/关闭作废回 P1 由「局状态不落盘」结构性保证（`GameState` 仅存内存，App 刷新即 reducer 归 null → home；技术方案 §2.1）；无跳过手段（相位守卫） |
| **US4 阵营发词正确** | **通过** | 一局内平民同词、卧底拿同对相近词（`dealer.test`）；3-7 人恰 1 卧底、8-12 人恰 2、简单恒 1（`dealer.test` + `referee.test` undercoverCountFor，非法人数抛错）；连玩 20 局词对与卧底人选分布随机、不与近期词对重复（`dealer.test` + `pushRecentPair` 去重截断，`storage.test` 持久化） |
| **US5 描述轮引导** | **通过** | 按存活顺序显示当前描述者头像+昵称+进度「第 X/N 位」（`DescribeView` + `app.smoke`）；「下一位」推进、末位按钮变「开始投票」（`app.smoke` 驱动全程）；出局者不在轮次中、底部灰显「已出局」（`machine.test` describeOrder + `qa.tie-fallback` 第 2 轮断言）；简单模式句式提示（`app.smoke`「它是一种动物」可见） |
| **US6 秘密投票** | **通过** | 每人投票前先经「是我，投票」交接确认（`app.smoke` / `qa.anticheat` 全程驱动）；候选不含自己与已出局者（`qa.anticheat` 断言无自己 radio；`qa.tie-fallback` 断言出局者非候选且灰显）；必须选择一人（确认按钮 `disabled={selected == null}`，`VoteView`）；全员投完公示每人得票数 + 谁投谁明细（`app.smoke`「大家是这样投的：」） |
| **US7 出局揭晓与推进** | **通过** | 出局页两段式：先亮人 → 手动翻牌亮身份与词（`app.smoke`「🎭 卧底！」「他的词：包子」）；平票两段处理且明确提示（`qa.tie-fallback`：公告「平票啦！」含并列票数 → 加赛 → 「还是平票」「这轮没人出局，再来！」）；连续 3 轮无人出局出现 M2「重开本局」（`qa.tie-fallback` 第 3 轮弹层、前两轮不弹）+ M1 二次确认；每轮结算按 §3.4 判定（`machine.test`：卧底全出局→平民胜、存活卧底≥平民→卧底胜、否则自动进下一轮） |
| **US8 战绩与连局** | **通过** | 结算按 §3.5 计分：全体 +1 局、获胜阵营含已出局者 +1 胜（`referee.test` applyGameResult + `app.smoke` localStorage 断言 + 结算页「✪ +1胜」标记）；「再来一局」沿用名单/头像/模式并重随词对（`app.smoke`「换新词啦」→ 回看词页）；关闭重开战绩仍在（`qa.leaderboard` 卸载重挂载后榜单仍在）；清空战绩二次确认（`qa.leaderboard` 取消不生效/确认后回空态且数据清空） |
| **US9 简单模式（默认）** | **通过（1 项无法验证）** | 打开即默认选中简单模式且可手动切换普通（`app.smoke` radio 断言 + `setupBoundary.smoke` 切换互不删除）；仅用简单难度词库（`dealer.test` difficulty=easy）+ 固定 1 卧底（`dealer.test`）+ 人数限 3-6（US2 证据）；描述页句式提示（`app.smoke`）；儿童化短文案（`copy.ts` 双模式表与 02-design §5.2 逐条一致，QA 对照核过 7 组文案）；**「6 岁儿童在家长口头引导下独立完成看词-隐藏-传递」为人工核验项：未执行，无法验证**（非缺陷，交互链路已自动化覆盖为两次点击） |
| **US10 词库放心** | **通过** | 110 对 ≥100（`qa.wordbank` 恰 110、简单池 50 / 普通池 60）；5 分类 × 2 难度全覆盖（两套测试）；清单随代码交付可逐条 review（`src/game/wordBank.ts` 即清单，含分类/难度注释）；**人工审核记录**：QA 通读全部 220 个词条——动物/食物/日常物品/动画角色（原创原型：公主/巫师/忍者等）/场所五类，无成人向、暴力、恐怖、敏感、商标词（QA 补充的黑名单自动化兜底亦全绿）；「猎人/海盗/小丑」等为儿童读物常见中性词，判定适宜 |

### M1-M9 核对

M1 局前设置 ✓（US2 证据）｜M2 模式与发词 ✓（US4 + 词库 110 对）｜M3 传机看词 ✓（US3）｜M4 描述轮 ✓（US5）｜M5 传机投票 ✓（US6 + 平票 §3.3）｜M6 出局与胜负 ✓（US7）｜M7 战绩与排行 ✓（US8）｜M8 连局 ✓（US8）｜M9 词库合规 ✓（US10 + 本报告人工审核记录）。

### 02-design 关键交互核对

- 12 视图 + 2 弹层全部落地：P1/P2/S1/P4(三态)/P5/P6(两态)/P7/P8(两段式)/P9(两屏)/P10/P11 + M1/M2 Modal、T1 Toast、E1 ErrorBoundary、P0 骢屏（源码逐一对应）。
- 防偷看三态（交接确认 → 看词 → 隐藏传递）与「词只出现一次」硬约束：自动化验证通过（§2.2 qa.anticheat）。
- 视觉基调：奶油底 #FFF8EF / 珊瑚橙 #F0633F / 薄荷绿=平民 / 葡萄紫=卧底 / 可可棕 ink 的 token 体系与 02-design §1.2 一致（global.css:6-33）；ink/2 加深至 #8A786A（偏差已记录，但实测仍未达 4.5:1，见 §6-1）。
- 大按钮：`.btn` min-height 56px、传机主按钮 `.btn--tall` 64px、宽 100%（容器 ≥88% 屏宽）（global.css:129-155）。
- 局内单向线性无返回、局前可自由往返：验证通过（§2.2）。

---

## 5. 专项检查

### 5.1 版权红线 —— **通过**

全仓 grep（`apps/family-undercover/`，排除 node_modules/dist，含词库、代码、文案、README、SVG）：

```
grep -rniE "美乐蒂|史蒂夫|My Melody|Steve|Minecraft|三丽鸥|Sanrio|Mojang|Hello Kitty|Kuromi|Cinnamoroll|帕恰狗|大耳狗|库洛米|喜羊羊|奥特曼|Ultraman|Peppa|海绵宝宝|SpongeBob|皮卡丘|Pikachu|哆啦A梦|Doraemon" \
  --exclude-dir=node_modules --exclude-dir=dist .
# 结果：0 匹配（exit 1 = not found）
```

4 个默认头像为原创 SVG 矢量绘制（`src/avatars/CustomAvatars.tsx`：暖爸/甜妈/像素小子/粉兜兔，通用几何图形，无任何官方形象特征复刻）；命名不含商标词。「动画角色」词对全部为原创原型（公主/王子/巫师/忍者等），符合 PRD §9-11 与技术方案 §11 偏差 1。

### 5.2 词库合规 —— **通过**

110 对全部逐条人工 review（US10 表内记录）；分布 5×(10+12) 与技术方案 §6.1 一致；自动化约束（id 规则/唯一性/长度/纯中文/黑名单）全绿。无成人向、暴力、恐怖、敏感、商标词。

### 5.3 移动端可用基线 —— **通过（含对比度次要问题，见 §6）**

- 视口 meta：`index.html` 含 `width=device-width, initial-scale=1.0, viewport-fit=cover` ✓；`theme-color` ✓（色值见 §6-4）。
- 触控目标：主按钮 ≥56px、传机主按钮 ≥64px（`.btn` / `.btn--tall`）✓；小按钮/文字链 min-height 44px ✓；emoji 大格 ≥44px ✓（css 多处 `min-height: 44px`）。
- 布局：`100dvh` + `env(safe-area-inset-bottom)` 适配手势条 ✓；词卡词语 56px（长词 48px 级降档 `--long`）✓。
- `prefers-reduced-motion` 降级存在（global.css:1841-1859：动效时长降至 0.01ms、confetti 隐藏、飘浮改淡入）✓。
- 对比度实测（WCAG 公式计算）：正文 ink 10.79:1 ✓；其余见 §6-1/6-2。

---

## 6. 问题清单

### 阻断问题（Blocking）

**无。**

### 次要问题（Minor，不阻断发布，建议下轮修复）

1. **辅助文字对比度未达 4.5:1 验收线**：`--ink-2 #8A786A`（技术方案 §11 偏差 2 自称已满足 4.5:1）实测 on 奶油底 #FFF8EF = **4.00:1**、on 白卡 #FFFFFF = **4.22:1**（13-14px 辅助说明）。位置：`src/styles/global.css:24`。建议再加深（约 #76655A 一档）或提升字号/字重。
2. **按钮白字对比度**：主按钮白字 on #F0633F = **3.20:1**（19-20px 加粗，满足 WCAG AA「大字 3:1」，低于 02-design §1.2 字面 4.5:1）；P8「翻开身份」白字 on #8C6FE6 = 3.80:1（同上口径）；**危险按钮白字 on #FF6B6B = 2.78:1**（16px 加粗非大字，低于 3:1，仅出现在 Modal 内的「清空/确认重开」）；身份卡渐变亮端（#4BD6B2/#A48BF0）上白字 1.82-2.79:1。建议：危险按钮与身份卡加深底色或改深色字。
3. **P4 隐藏过渡反馈缺失**：对照 mockup `p04c-word-hidden.svg` 与 02-design §1.2 动效表，「词已藏好」绿色确认条与 🙊 盖章 300ms 动效未实现（点「记住啦，隐藏」后直接切下一位交接卡）。防偷看硬约束（词即时消失、无残留、不可回看）不受影响且有测试证据。
4. **theme-color 与主 token 不一致**：`index.html` `#FF8A3D` vs `--primary #F0633F`（极次要，浏览器状态栏底色）。
5. **人工/真机项未执行（无法验证，非缺陷）**：① US9「6 岁儿童真机独立完成看词-隐藏-传递」；② 真机断网全流程实测（Web 平台「未访问过的设备无法离线首开」为固有限制，已在技术方案 §10-1 记录；访问过一次后 SW cache-first 全量离线，代码层已验证零网络依赖）。建议发布前由用户做一次真机冒烟。

---

## 7. 结论与放行建议

- 验收命令：`npm run build` ✓ / `npm test` ✓（70/70）/ `npm run lint` ✓ / `npm run preview` ✓（HTTP 200）。
- US1-US10：9 条通过，US9 含 1 个人工核验项（无法验证）；MVP（M1-M9）全部落地且有自动化或人工审查证据。
- 阻断问题 0，次要问题 5（对比度 2 项、过渡动效 1 项、theme-color 1 项、真机人工项 1 项）。

**测试门禁：通过。** 建议进入发布阶段；次要问题随下一迭代修复。

---

## 8. v0.2.0 回归验收（2026-09-21）

### 8.1 背景与范围

开发按用户 2026-09-21 两条指示完成增量修改（git 工作区未提交改动），本节为 QA 独立回归验收，聚焦增量、不重跑全量专项：

1. **删除描述环节**（PRD §9-12 / §3.2 / §3.3 / §3.7 修订）：看词完成 → 直接进入投票；平票改为「全体存活玩家直接重投一次（可换票）→ 仍平则本轮无人出局」；「同一轮最多重投一次」「连续 3 轮无人出局 M2 兜底」保留；
2. **「甜妈」头像年轻化**（PRD §9-13）：30 岁左右甜美女性萌系卡通（双马尾长卷发 + 蝴蝶结、明亮大眼、腮红、甜美笑容），名称不变。

评审输入：`docs/01-prd.md`（修订版）、`docs/02-design.md`（11 视图 / F1-F9 修订版）、`apps/family-undercover/` 全部源码与测试。环境同 §首（macOS arm64 / Node v26.9.0 / Vitest 3.2.7）。

### 8.2 开发改写测试的忠实性复核（抽查 4 文件，逐断言核对）

| 文件 | 复核要点 | 结论 |
|---|---|---|
| `machine.test.ts`（15 例） | `beginGame`（L38-46）：peekDone → `START_VOTE` 直达 `vote` 相位，中间无任何描述相位（L82）；平票 6 例完整：首投平票 → `tieAnnounce`（全员并列者）→ `START_TIEBREAK` 清空旧票、全员重投（`tiebreak=true`，L148-164）→ 唯一最高出局；重投仍平 → `tieStuck` + `noExitStreak=1` → `TIE_STUCK_NEXT` 下一轮（L166-178）；「同一轮最多重投一次」幂等断言（L180-186）；3 轮兜底 + 出局归零（L188-211） | **忠实，无弱化** |
| `app.smoke.test.tsx`（2 例） | P4 态 C「词都记住啦！」→ 直接「开始投票 🗳️」；**负向断言**「开始描述 🎤」按钮不存在（L52）；防偷看断言保留（隐藏后词从 DOM 消失，L46） | **忠实** |
| `qa.anticheat.test.tsx`（1 例） | 防偷看断言完整保留：词仅在看词态 B 渲染，态 A / 态 C / 投票交接 / 选票 / 票型公示 / P8 第一段逐屏 `expectNoWordAnywhere`；局内无「回首页/返回」导航；候选不含自己（radio 断言）；**负向断言**「开始描述 🎤」不存在（L67） | **忠实** |
| `qa.tie-fallback.test.tsx`（2 例） | 平票两段 UI 全程：P7「重新投一次 ▶」→ P9「平票啦！」含并列票数 + 简单模式短文案 →「重新投票 🗳️」→ 重投轮顶部「🔄 重新投票 · 可以换票」→ 唯一最高出局 → 下一轮不含出局者（radio 缺席 + 灰显「已出局：」）；仍平「还是平票」「这轮没人出局，再来！」→「下一轮 ▶」；**负向断言**「开始加赛 🎤」不存在（L95）；3 轮兜底 M2（前两轮不弹）→ M1 二次确认 → 回看词页 `看词 1/4` 且档案为空（不计战绩） | **忠实** |

### 8.3 QA 补充用例（1 文件 / 3 例，覆盖缺口）

新增 `src/__tests__/qa.regression-v020.test.tsx`：

| # | 用例 | 验证点 |
|---|---|---|
| 1 | 重投轮候选排除（machine，普通模式第 2 轮、D 已出局） | 平票重投时 `tiebreakIds` 为**全部存活者**（非仅平票者）；重投轮 `VOTE_CAST` 投已出局者（p4）/ 投自己（p1）均抛错；重投唯一最高可正常出局并推进至终局（`eliminatedIds=['p4','p3']`、平民胜） |
| 2 | 「连续 3 轮」计数连续语义（machine） | 2 次无人出局（streak=1,2 不触发）→ 有人出局 streak 归 0 → 再连续 3 次无人出局，恰好第 3 次（streak=3）触发 `showFallback`——验证「连续」而非「累计」 |
| 3 | 普通模式无描述步（UI） | 切「🎭 普通」开局（名单保留）→ 全员看完词 →「词都记住啦！」+ 普通模式文案「大家先聊一聊，随时开始投票」→ **无「开始描述 🎤」按钮、无「句式」「它是一种」文案** → 点「开始投票 🗳️」直达第一位投票人交接卡（P4→P6 直连） |

> 调试期间 3 次失败均为**测试驱动自身错误**（淘汰后仍用旧 tieMap 引用已出局玩家——该错误反而再次验证了状态机守卫会抛错；一次编辑产生的重复 `stuckRound` 调用；漏驱动一次重投 `voteAll`），修正的均为测试代码，**未放宽任何断言、未改动业务代码**。

### 8.4 验收命令与原始输出（命令目录 `apps/family-undercover/`）

```
npm run build   → exit 0
  vite v7.3.6 building client environment for production...
  ✓ 60 modules transformed.
  dist/index.html                   0.74 kB │ gzip:  0.50 kB
  dist/assets/index-DH38KXwO.css   22.79 kB │ gzip:  5.02 kB
  dist/assets/index-CshSh0XJ.js   274.83 kB │ gzip: 85.37 kB
  ✓ built in 299ms

npm test         → exit 0：15 文件 / 73 用例全绿（含 qa.regression-v020.test.tsx 3 例新增）
  Test Files  15 passed (15)
       Tests  73 passed (73)
    Duration  2.66s

npm run lint     → exit 0（0 error / 0 warning，无输出）
```

（与 v0.1.0 相比 build 产物 61→60 modules：删除 DescribeView 后模块数下降，符合预期。）

### 8.5 专项复核

**a) 描述/句式死代码 grep —— 通过**

```
grep -rniE "描述|句式|describe|DESCRIBE|SentenceHint|DescribeView|加赛" src/ --include="*.ts" --include="*.tsx" --include="*.css"（排除 __tests__）
# 仅 4 处命中，均为注释：types.ts:39 / machine.ts:5 / machine.ts:111 / PeekView.tsx:18
# 内容全部为「无描述环节（2026-09-21 修订）」的规则说明性注释，非死代码、非死文案
```

- `src/views/` 11 个视图文件，**无 DescribeView.tsx**；`SentenceHint` 零命中；测试目录 `describe` 均为 vitest API；
- `HowToPlaySheet.tsx` 三步玩法已同步：「全员看完词，大家面对面聊一聊」「平票就全员重投一次」，无描述步；
- `copy.ts` 双模式文案表与 02-design §5.2 修订版逐条一致（peekDoneHint/tieExplain/tieStuck 均为新口径）；
- README 命中 1 处为规则性表述（豁免范围）。

**b) 甜妈新头像 —— 通过（代码结构核验）**

- `CustomAvatars.tsx` `TianmaAvatar` 已重绘，PRD §9-13 要求要素逐项落地：双马尾**长卷发**（两侧 #A0603A 长发片延至 y≈35 + 发梢外卷高光 #C58A5C×2）、**粉色蝴蝶结发圈**（#F48FB1×2）、**放大明亮双眼**（r=2.5 + 每眼双高光）、**腮红**（#F7B8A0×2）、**甜美笑容**（上扬唇线）、粉上衣白领结；发色/构图与暖爸（#5A4632 短发眼镜）明显区隔，符合「30 岁左右甜美女性」而非「同龄妈妈」；
- `catalog.ts` 中名称仍为「甜妈」（`custom:tianma`），**名称未变**；4 个原创头像（nuandad / tianma / pixelkid / pinkbunny）完整，总数 54（4 原创 + 50 emoji）断言全绿（`setup.test`）；QA 已将 4 头像提取为独立 SVG 并生成渲染产物核验（无渲染错误）；核验方式为**图元结构审查**，未做人工肉眼评审（不影响判定，要素为客观图元）；
- `docs/mockups/p02-setup.svg`、`s01-avatar-picker.svg` 已同步新配色（含 #A0603A / #F48FB1），旧 p05 描述页 mockup 已删除（13 张与 02-design 附二一致）。

**c) 用户故事抽验（3 条受影响，新 PRD 编号）**

| US | 结论 | 证据 |
|---|---|---|
| 原 US5 描述轮（已删除） | **删除完整落地** | 代码/视图/文案/词库零残留（a 项）；替代流程「看词完成 → 开始投票」简单模式（app.smoke / qa.anticheat）与普通模式（qa.regression-v020）均有直连断言 |
| US5 秘密投票（原 US6） | **通过** | 投票前「是我」身份确认（app.smoke / qa.anticheat 全程）；候选不含自己与已出局者（qa.anticheat radio 断言 + qa.tie-fallback 第 2 轮 + regression-v020 重投轮 VOTE_CAST 抛错）；必须选择一人（`disabled={selected == null}`）；全员投完公示票数 + 谁投谁明细（「大家是这样投的：」） |
| US6 出局揭晓与推进（平票修订） | **通过** | 出局页亮身份与词（「🎭 卧底！」「他的词：包子」）；平票明确提示两段（「平票啦！」含票数 →「重新投票 🗳️」可换票；「还是平票」「这轮没人出局，再来！」）；连续 3 轮出现「重开本局」（M2）+ 二次确认（M1）；§3.4 判定（machine.test 卧底全出局/追平即胜/否则下一轮） |
| US8 简单模式（默认） | **通过（1 项无法验证）** | 默认简单 + 可切普通且名单保留（app.smoke + regression-v020）；简单词库/恒 1 卧底/3-6 人（dealer.test + 边界测试）；儿童短文案（copy.ts 双模式表）；「6 岁儿童人工核验」仍无法验证（人工项，同 §6-5） |

### 8.6 问题清单

**阻断问题：无。**

**次要问题（本次新增 1 项）：**

1. `package.json` `version` 仍为 `"0.1.0"`，未随本次 v0.2.0 修订口径递增——影响发布产物版本标识（非功能缺陷）。**建议发布阶段 bump 至 0.2.0**（属 release-ops 职责）。

**结转 v0.1.0 遗留次要问题（本次复核确认仍存在，均不阻断）**：§6-1/6-2 对比度 2 项（`--ink-2 #8A786A` 实测仍 4.0x:1、危险按钮白字）、§6-3 P4 隐藏过渡反馈、§6-4 theme-color `#FF8A3D`、§6-5 真机人工项 2 项。

### 8.7 回归结论

**通过（passed = true）。** 两条修订指令在状态机（machine.ts 相位与 §3.3 重投逻辑）、视图（11 视图无 DescribeView）、文案（copy.ts 双模式表）、说明页（HowToPlaySheet）、设计资产（mockup 同步）五个层面一致落地且互相印证；开发改写的测试断言忠实、负向断言（「开始描述」「开始加赛」不存在）齐备；QA 补充 3 例覆盖重投轮候选排除、连续计数语义、普通模式直连后全部通过；验收命令 build / test（73/73）/ lint 全绿；无阻断问题。

**测试门禁：维持通过。** 可继续发布流程（建议先处理次要问题 1 的版本号）。

---

## 9. v0.3.0 回归验收（2026-09-25）

### 9.1 背景与范围

v0.2.0 上线后，开发按用户 2026-09-22 两条玩法修订（PRD §9 第 14、15 条，设计权威 = `docs/archive/family-undercover-design-addendum-v030.md`）完成增量修改（git 工作区未提交改动），本节为 QA 独立回归验收，聚焦增量：

1. **出局揭晓只亮身份、不亮词**（PRD §9-14 / §3.2 第 4 步）：无论出局者是平民还是卧底，揭晓页一律不展示词语、无「他的词：××」句式；词语的唯一公开时机 = 终局结算页 FinalView（平民词/卧底词对照 + 每行「词语：××」按新规则保留）；
2. **看词与投票顺序随机化**（PRD §9-15 / §3.2 第 2、3 步）：看词顺序每局开局随机生成一次（与名单顺序无关、局内不变）；每一轮投票顺序在该轮开始时重新洗牌；平票重投沿用本轮顺序不重排；进入新一轮才重排；出局者自动从后续轮次顺序中移除；可验收口径：注入固定随机种子可复现顺序，不同局、不同轮次的顺序可不同。

评审输入：PRD 归档件（§3.2、§3.3、§3.4、§9-14/15）、设计附录 v0.3.0、`apps/family-undercover/` 全部源码与测试。环境：macOS darwin 25.6.0 arm64 / Node v26 / Vite 7.3.6 / Vitest 3.2.7。红线遵守：未改动任何业务代码与 PRD/设计附录，未做任何 git 操作。

### 9.2 断言忠实性复核（抽查 4 文件，逐断言核对）

| 文件 | 复核要点 | 结论 |
|---|---|---|
| `machine.test.ts`（21 例） | ① **固定种子复现**：「注入固定种子时看词顺序与首轮投票顺序可复现」用 mulberry32 同种子双跑，`peekOrder`/`voteOrder` 逐一 `toEqual` 且均为全员重排；② **两轮顺序不同**：「新一轮重新洗牌」用 `sequenceRng([0.9…])` 精确控制首轮洗成名单序 `['p1'..'p4']`、`TIE_STUCK_NEXT` 用 `sequenceRng([0,0,0])` 精确洗成 `['p2','p3','p4','p1']`——**精确到逐位的预言断言**（QA 独立复算 Fisher-Yates 验证两序列确为该种子下的确定性结果），并断言出局轮 `voteOrder` `not.toContain('p2')` 且恰为存活者全集；③ **平票重投沿用本轮序**：`expect(s.voteOrder).toEqual(roundOrder)` 精确相等 + 重投路径逐位 `['p1','p2','p3','p4']`；④ **出局者移除**：出局后第 2 轮排序恰为存活 3 人；⑤ 顺序非名单序（多种子扫描）与均匀性冒烟（24 种子 >3 种排列）保留完整 | **忠实，无弱化、无删失** |
| `app.smoke.test.tsx`（2 例） | 看词/投票全程**动态读取交接卡目标**推进（`handoffName()`，随机序下无法预言）；每轮结束断言交接序列为全员重排（sort 后 `toEqual`）；揭晓页**双重否定断言**：`queryByText(/他的词/)` 不存在 + `queryByText('包子')`（卧底词本体）不存在，且保密提示「词语会在终局揭晓，别急 👀」可见；终局词对照断言保留（「平民词：饺子」「卧底词：包子」） | **忠实** |
| `qa.anticheat.test.tsx`（2 例） | **双向无词断言**：`expectNoWordAnywhere` 同时检查平民词「猫」与卧底词「狗」（`exact: false`）+ `/他的词/` 句式；**卧底出局情形**（例 1）：翻牌后「🎭 卧底！」可见 + 全页无词 + 保密提示可见 + 终局词对照保留（「词语：猫」×3 /「词语：狗」×1）；**平民出局情形**（例 2，v0.3.0 新增）：「🌱 平民！」+ `expectNoWordAnywhere` + 保密提示 + 第 2 轮交接正常（顺序重排、动态校验） | **忠实** |
| `qa.tie-fallback.test.tsx`（2 例） | **重投交接序列一致**：首投记录 `firstOrder`，重投轮 `expect(revoteOrder).toEqual(firstOrder)` **精确逐位相等**（沿用本轮顺序、不重排），且交接卡与选票两态均带「🔄 重新投票 · 可以换票」标注；重投唯一最高出局 → 揭晓页 `queryByText(/他的词/)` 不存在（平民出局）；下一轮候选不含出局者（radio 缺席 + 灰显「已出局：」）；3 轮兜底链路完整保留 | **忠实** |

### 9.3 QA 补充用例（1 例，覆盖缺口）

复核发现的真实缺口：既有 8 人普通局用例经 `voteAll` 按 `voteOrder` 驱动投票，但**未显式断言状态机按本轮随机序轮转投票人**——若机器退化为按名单序指派投票人，既有断言仍会通过（「投自己抛错」仅隐式覆盖第一位）。

新增 `machine.test.ts`「8 人普通局 2 卧底：投票人严格按本轮 voteOrder 轮转」：

- 用 `sequenceRng([0])` 确定性预言 8 人洗牌结果 = 名单序左旋一位 `['p2'..'p8','p1']`（QA 独立复算验证），断言本轮 `voteOrder` 逐位等于该预言（≠ 名单序，证明确被随机打乱）；
- **核心断言**：`s.votes.map(v => v.voterId)` 逐位 `toEqual` 本轮 `voteOrder`——票的 voter 序列与随机序完全一致（轮转投票人）；`targetId` 序列同步精确断言；
- 卧底 B 以 7 票唯一最高出局（剩 1 卧底 vs 6 平民未分胜负）→ 第 2 轮 `voteOrder` 精确等于存活 7 人左旋一位 `['p3'..'p8','p1']`（出局者移除后重排）、`votes` 清空。

> 本例为纯新增，未修改既有断言；业务代码零改动。

### 9.4 验收命令与原始输出（命令目录 `apps/family-undercover/`，2026-09-25）

```
npm run build   → exit 0
  > family-undercover@0.3.0 build
  > tsc -b && vite build
  vite v7.3.6 building client environment for production...
  ✓ 60 modules transformed.
  dist/index.html                   0.74 kB │ gzip:  0.50 kB
  dist/assets/index-DQ-7VmNm.css   23.43 kB │ gzip:  5.11 kB
  dist/assets/index-Bfu1DRT5.js   276.19 kB │ gzip: 85.62 kB
  ✓ built in 295ms

npm test         → exit 0：15 文件 / 81 用例全绿
  ✓ src/__tests__/machine.test.ts (22 tests)      ← 21 例 + QA 新增 1 例
  ✓ src/__tests__/qa.anticheat.test.tsx (2 tests)
  ✓ src/__tests__/qa.tie-fallback.test.tsx (2 tests)
  ✓ src/__tests__/app.smoke.test.tsx (2 tests)
  ✓ src/__tests__/qa.regression-v020.test.tsx (3 tests)
  ✓ ...（其余 10 文件全绿，明细见 §3.2 与 §8.4）
  Test Files  15 passed (15)
       Tests  81 passed (81)

npm run lint     → exit 0（0 error / 0 warning，无输出；QA 新增用例后复跑仍通过）
```

（补充用例加入前后各完整跑过一次 `npm test`：80/80 与 81/81 均全绿。）

### 9.5 专项检查

**a) 揭晓页无词渲染路径 grep —— 通过**

- `src/views/RevealView.tsx`：无 `wordOf` / `assignment.pair` / 具体词引用；第二段身份卡仅渲染头像 + 名字 + `role === 'undercover' ? '🎭 卧底！' : '🌱 平民！'` 三要素；「词语」字样仅出现在注释与保密提示文案（「词语会在终局揭晓」）中，非词语渲染；
- `src/game/copy.ts`：无「他的词」句式；揭晓页相关文案仅 `revealSecretHint`（保密提示）与 `revealWatchNote`（围观小字），均不含任何词对内容；
- 全 `src/views/` + `src/game/` grep「他的词」：**0 命中**（该句式仅存在于 3 个测试文件的**否定断言** `queryByText(/他的词/)).not.toBeInTheDocument()` 中，属泄词防御而非渲染）；
- `wordOf` / `assignment.pair` 在视图层的全部引用点仅 2 处：`PeekView.tsx:63`（看词态 B，本人见自己词，合法）与 `FinalView.tsx:56/57/74`（终局词对照，合法）——与「词语唯一公开时机 = 终局结算页」严格一致。

**b) FinalView 词对照保留 —— 通过**

`FinalView.tsx` 顶部胶囊「平民词：{pair.civilian}」「卧底词：{pair.undercover}」与玩家列表每行「词语：{wordOf(state, p.id)}」完整保留（设计附录 §2.2：p10-result 按新规则无需改动），并有自动化断言（app.smoke L105-106、qa.anticheat L160-163）。

**c) 版本号 —— 通过**

`package.json` `"version": "0.3.0"`；build 产物横幅 `family-undercover@0.3.0` 一致（§8.6 次要问题 1 的版本号递增事项本轮已落实）。

**d) 顺序随机 UI 接线 —— 通过**

`PeekView.tsx:41` 按 `state.peekOrder` 渲染交接与进度条；`VoteView.tsx:25/65/96` 按 `state.voteOrder` 渲染交接卡、进度头像条与候选卡（出局者本就不在 voteOrder 中，底部另有「已出局：」灰显提示）。UI 层与状态机同源，无第二套顺序逻辑。

### 9.6 逐条验收（对照 PRD §9-14 / §9-15 可验收口径）

| 验收点 | 结论 | 证据 |
|---|---|---|
| §9-14 出局揭晓只亮身份不亮词（卧底出局） | **通过** | RevealView 第二段仅三要素（专项 a）；qa.anticheat 例 1 + app.smoke 双重否定断言 |
| §9-14 出局揭晓不亮词（平民出局） | **通过** | qa.anticheat 例 2（「🌱 平民！」+ expectNoWordAnywhere）+ qa.tie-fallback（`/他的词/` 不存在） |
| §9-14 词语唯一公开时机 = 终局结算页 | **通过** | 专项 a（引用点仅 PeekView 态 B 与 FinalView）+ b（词对照保留） |
| §9-15 看词顺序每局随机、局内不变 | **通过** | machine `peekOrder` 开局生成一次；复现/非名单序/均匀性断言；UI 按 peekOrder 渲染（专项 d）；app.smoke 动态驱动 + 全员重排断言 |
| §9-15 每轮投票顺序该轮重新洗牌 | **通过** | machine `START_VOTE`/`TIE_STUCK_NEXT`/`CONTINUE_AFTER_REVEAL` 三入口均 shuffle；「两轮顺序不同」逐位预言断言（`['p1'..'p4']` → `['p2','p3','p4','p1']`）；UI 按 voteOrder 渲染（专项 d） |
| §9-15 平票重投沿用本轮顺序 | **通过** | `START_TIEBREAK` 不动 voteOrder（machine.ts L185-190）；machine `toEqual(roundOrder)` 精确断言；qa.tie-fallback `revoteOrder toEqual firstOrder` UI 级断言 |
| §9-15 出局者从后续顺序移除 | **通过** | 新一轮只洗存活者；`not.toContain('p2')` + 存活全集断言；QA 新增 8 人局第 2 轮逐位断言；候选不含出局者（qa.tie-fallback） |
| §9-15 固定种子可复现、不同局/轮可不同 | **通过** | mulberry32 同种子双跑 `toEqual`；24 种子 >3 种排列均匀性冒烟 |
| §3.3/§3.4 回归（平票两段、胜负判定、兜底、计分） | **通过** | machine 平票 6 例 + qa.tie-fallback 2 例 + qa.regression-v020 3 例全绿（未受本轮改动影响） |

### 9.7 问题清单

**阻断问题：无。**

**次要问题：本次无新增。**

结转遗留（本轮聚焦增量未复核整改，均不阻断）：§6-1/6-2 对比度 2 项（`--ink-2 #8a786a`、危险按钮白字，本轮确认 token 未变）、§6-3 P4 隐藏过渡反馈、§6-4 theme-color `#FF8A3D` ≠ `--primary #f0633f`（本轮确认仍存在）、§6-5 真机人工项 2 项（6 岁儿童真机核验、真机断网实测）。§8.6 次要问题 1（版本号）已落实为 0.3.0，销项。

### 9.8 回归结论

**通过（passed = true）。** 两条玩法修订在状态机（peekOrder/voteOrder/三处 shuffle 入口）、视图（PeekView/VoteView/RevealView/FinalView）、文案（copy.ts 保密提示）、测试四个层面一致落地；断言忠实性抽查 4 文件未发现任何弱化或删失，关键断言均为精确逐位/双向否定级；QA 补充 1 例补齐「voteOrder 轮转投票人」显式断言后 15 文件 / 81 用例全绿；build / lint exit 0；专项 a-d 全部通过；无阻断问题。

**测试门禁：通过。** 可进入发布阶段；结转次要问题建议随下一迭代处理。
