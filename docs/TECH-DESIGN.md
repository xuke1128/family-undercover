# 技术方案：家庭卧底派对（Family Undercover）

> 归档注记：本文为项目文档的入仓镜像（2026-09-25 复制自工作区归档稿 `docs/archive/family-undercover-run1-20260921/03-tech-design.md`）；正文中的 `docs/…` 路径为撰写时工作区共享文档路径，非本仓库 `docs/` 结构，本仓库文档索引见 [README.md](README.md)。

> 输入依据：`docs/01-prd.md`（已定稿）、`docs/02-design.md`（已定稿）与 `docs/mockups/`（13 张界面图）。
> 本文覆盖：技术选型、架构与目录、数据模型、状态与持久化、界面映射、词库与头像资产、任务拆解、验收命令、部署方案与环境变量清单。
> 应用代码目录：`apps/family-undercover/`（自包含，即未来 GitHub 仓库根目录）。

---

## 0. 修订记录

| 日期 | 修订 | 影响面 |
|---|---|---|
| 2026-09-22 | **出局揭晓只亮身份、不亮词**（PRD §9-14 / 设计附录 v0.3.0 §2，2026-09-22 用户反馈）：RevealView 第二段身份卡只保留三要素——出局者头像、名字、「🎭 卧底！」（平民出局为薄荷绿卡 +「🌱 平民！」），删除「他的词：××」；卡片下方固定保密提示「词语会在终局揭晓，别急 👀」（按 p08b 补齐引导语与围观小字）；**FinalView 词对照保留不变**（终局是词语唯一公开时机） | `RevealView.tsx`（重写第二段，移除 wordOf 引用）、`copy.ts`（新增 revealSecretHint / revealWatchNote）、`global.css`（身份卡三要素样式替换词卡样式）；`qa.anticheat` 断言翻转为「揭晓页不含任何词语」（覆盖平民与卧底出局两情形）、`app.smoke` 删除揭晓报词断言；FinalView 无改动 |
| 2026-09-22 | **看词与投票顺序随机化**（PRD §9-15 / 设计附录 v0.3.0 §3，2026-09-22 用户反馈）：开局生成看词随机序 **peekOrder**（每局一次、与名单顺序无关）；**每一轮投票顺序在该轮开始时重新洗牌生成 voteOrder**（首轮 `START_VOTE`、后续轮 `CONTINUE_AFTER_REVEAL` / `TIE_STUCK_NEXT`）；平票重投 `START_TIEBREAK` **沿用本轮 voteOrder 不重排**；出局者自动从后续轮次顺序移除（新一轮只洗存活者）；洗牌复用 `rng.ts` 的 Fisher-Yates，RNG 经 Action 注入保持 reducer 纯函数可复现（固定种子 ⇒ 顺序可复现） | `types.ts`（GameState 增 peekOrder/voteOrder）、`machine.ts`（5 个动作增 rng 参数）、`App.tsx`/`GameView.tsx`（注入 mathRandom）、`PeekView`（交接卡与进度头像条按 peekOrder）、`VoteView`（交接卡、进度条与候选卡按当轮 voteOrder）；`machine.test` 改按状态顺序驱动并新增顺序断言（复现/非名单序/重排/重投沿用/出局者移除/均匀性冒烟），`app.smoke`/`qa.tie-fallback`/`qa.regression-v020` 改动态读交接卡目标推进，`qa.tie-fallback` 增「重投交接序列与首轮一致」断言 |
| 2026-09-21 | **删除描述环节**（PRD §9-12 / 设计修订①）：所有人看词完成后**直接进入投票**（`START_VOTE`），App 不做逐人描述引导、不设发言顺序与句式提示；平票处理改为「**全员直接重投一次（可换票）→ 仍平票则本轮无人出局**」，删除「平票者再描述」加赛；「同一轮最多重投一次」「连续 3 轮无人出局兜底（M2）」不变 | `machine.ts`（删 `describe` 相位与 `START_DESCRIBE`/`DESCRIBE_NEXT`，增 `START_VOTE`）、`types.ts`、`copy.ts`（删句式提示/描述文案，增看词完成引导）；删 `views/DescribeView.tsx`；`PeekView`（态 C 引导开始投票）、`VoteView`（平票重投标注「🔄 重新投票 · 可以换票」+ 下一轮横幅「第 N 轮 · 还剩 X 人」）、`TieView`（P9 两屏按新规则）、`VoteResultView`（平票按钮「重新投一次 ▶」）、`HowToPlaySheet`/`SetupView` 文案；CSS 删描述/句式卡样式；测试同步改写（machine/smoke/anticheat/tie-fallback），防偷看、计票、胜负、计分断言全部保留 |
| 2026-09-21 | **「甜妈」头像年轻化**（PRD §9-13 / 设计修订②）：重绘为 30 岁左右年轻甜美女性萌系卡通——双马尾长卷发（栗棕 #A0603A、发梢卷高光）+ 粉色蝴蝶结发圈、放大明亮双眼（双高光）、腮红、甜美笑容、粉上衣白领结；名称仍「甜妈」，暖爸/像素小子/粉兜兔不变 | 仅 `avatars/CustomAvatars.tsx` 的 `TianmaAvatar`（图形按更新后的 `p02-setup.svg` 1:1 提取） |

---

## 1. 技术选型与理由

### 1.1 结论

| 层 | 选择 | 版本（锁定于 package.json） |
|---|---|---|
| 构建 | Vite | ^7.0.0 |
| 框架 | React（函数组件 + Hooks） | ^19.1.0 |
| 语言 | TypeScript（`strict: true`） | ~5.8.3 |
| 测试 | Vitest + Testing Library（jsdom） | ^3.2.0 / ^16.3.0 |
| Lint | ESLint 9 flat config + typescript-eslint + react-hooks | ^9.30.0 |
| 样式 | 单文件全局 CSS（设计 token 为 CSS 变量），动效纯 CSS | — |
| 运行时依赖 | **仅 `react` + `react-dom` 两个**，零网络请求、零后端、零密钥 | — |

### 1.2 理由与放弃项

- **纯前端 SPA（无路由库）**：页面流转是「局前自由往返 + 局内单向线性」，一共 4 个顶层屏幕（home/setup/game/leaderboard），自建一个受控的 screen 状态即可完整表达，引入 react-router 反而增加体积与「局内出现历史导航」的防偷看风险（DP3）。**放弃项：react-router**。
- **useReducer 纯状态机**：全部玩法规则（发词、计票、平票、胜负、计分口径、兜底）收敛在可单测的 reducer 中，随机数与 IO 全部外置注入（RNG 参数化、localStorage 经由 App 层副作用），保证「核心逻辑 100% 可自动验证」这一质量门禁。
- **全局 CSS 而非 CSS-in-JS / Tailwind**：视觉 token 少（10 色 + 字号/圆角/间距阶梯）、组件数量中等；单文件 `global.css` 零依赖、便于逐条对照 mockup 微调，且天然支持 `prefers-reduced-motion` 降级。**放弃项：styled-components / Tailwind**。
- **测试选 Vitest**：与 Vite 同生态、配置零成本；Testing Library 以「用户视角查文案/点按钮」写关键路径冒烟。
- **Service Worker 手写（约 40 行）而非 vite-plugin-pwa**：PRD 要求断网可玩；生产构建注册一个 cache-first SW（缓存 index.html 与构建产物）即可满足「访问过一次后完全离线」。**放弃项：vite-plugin-pwa / workbox**（多一个依赖，收益相同）。平台约束见 §10。

## 2. 系统架构与目录结构

### 2.1 模块划分与数据流

```
┌────────────────────────── App.tsx（顶层编排）──────────────────────────┐
│ screen 状态(home/setup/game/leaderboard) │ toast │ 弹层 │ ErrorBoundary(E1) │
│        │ dispatch                        │ 副作用：计分入档 / 记录近期词对   │
│        ▼                                                                │
│  gameReducer（纯函数，src/game/machine.ts）── 全部玩法规则                │
│        ▲ 依赖（纯模块）                                                   │
│  dealer（发词分配） tally（计票/平票） referee（胜负/卧底数/计分口径）      │
│  setup（名单边界校验） wordBank（词库） copy（双模式文案） rng（可注入随机）│
│        │                                                                │
│  storage/appStore.ts（localStorage 读写，唯一 IO 出口，版本化）            │
└──────────────────────────────────────────────────────────────────────┘
   views/*（11 视图 + 2 弹层） ← 渲染 state；ui/*（按钮/卡片/弹层等基础件）
```

- **单向数据流**：视图只 dispatch 动作；reducer 只算状态；IO（localStorage、SW 注册）只发生在 App 层副作用。局内状态（GameState）**不持久化**——刷新即作废回首页（PRD §8），从机制上满足「无词残留、不可回看」。
- **防偷看的结构性保证**：词语文本仅存在于 GameState 内存与 PeekView 态 B 一处渲染点；隐藏后态 A/C 及其余视图不引用词字段；局内视图无任何返回导航。

### 2.2 目录结构（一级/二级）

```
apps/family-undercover/
├── index.html                 # 竖屏 viewport + theme-color + 中文 meta
├── package.json / tsconfig*.json / eslint.config.js / vite.config.ts
├── .env.example               # 注明「无需任何环境变量」
├── .gitignore
├── README.md                  # 运行/测试/部署说明 + Roadmap
├── public/
│   ├── favicon.svg            # 原创气球 🎈 标
│   └── sw.js                  # 手写离线缓存（仅生产注册）
└── src/
    ├── main.tsx               # 入口：挂载 + 生产环境注册 SW
    ├── App.tsx                # 顶层编排（screen/toast/副作用/ErrorBoundary）
    ├── styles/global.css      # 设计 token + 全部组件样式 + 动效 + reduced-motion
    ├── game/                  # ★ 纯逻辑层（无 DOM、无 IO，全部可单测）
    │   ├── types.ts           # 领域类型（Player/Role/Phase/GameState…）
    │   ├── rng.ts             # RNG 类型 + mathRandom 默认实现 + 工具
    │   ├── wordBank.ts        # 词库数据（110 对，5 分类 × 2 难度）
    │   ├── dealer.ts          # 选词对（避开近期重复）+ 分配卧底
    │   ├── tally.ts           # 计票、最高票与平票判定
    │   ├── referee.ts         # 卧底数量映射、胜负判定、战绩计分口径
    │   ├── setup.ts           # 人数边界/模式切换/名单校验/默认预填名单
    │   ├── machine.ts         # 游戏状态机 reducer（玩法规则核心；无描述环节，平票=全员直接重投一次；看词/投票顺序随机，RNG 经 Action 注入）
    │   └── copy.ts            # 双模式文案表（§5.2 对照表的落地）
    ├── avatars/
    │   ├── catalog.ts         # 54 个头像清单（4 原创 + 50 emoji，分组+底色）
    │   └── CustomAvatars.tsx  # 4 个原创 SVG 头像（暖爸/甜妈/像素小子/粉兜兔）
    ├── storage/
    │   └── appStore.ts        # localStorage 版本化读写 + 校验 + 排行榜排序
    ├── ui/                    # 基础组件：Button 系列/Modal/Toast/Banner/Avatar/
    │                           HandoffCard/ProgressAvatars/IdentityBadge 等
    ├── views/                 # P1/P2/S1/P4/P6-P11 视图 + HowToPlaySheet（P5 描述视图已随玩法修订删除）
    └── test/setup.ts          # Vitest 环境配置
```

## 3. 数据模型

### 3.1 领域类型（src/game/types.ts）

```ts
type GameMode = 'simple' | 'normal';            // 默认 simple
type Role = 'civilian' | 'undercover';           // 平民 / 卧底
type Camp = Role;                                 // 获胜阵营
type Difficulty = 'easy' | 'normal';
type Category = 'animal' | 'food' | 'object' | 'character' | 'place';

interface Player { id: string; name: string; avatarId: string; }   // avatarId 见 §6.2
interface WordPair {
  id: string;                // 如 'food-e1'
  category: Category; difficulty: Difficulty;
  civilian: string; undercover: string;      // 卧底词（同对相近词）
}
interface Vote { voterId: string; targetId: string; }
interface Assignment { pair: WordPair; roles: Record<PlayerId, Role>; }
```

**GameState（内存态，不落盘）**：`mode / roster / assignment / peekOrder / voteOrder / phase / roundNo / votes / eliminatedIds / tiebreakIds / noExitStreak / showFallback / winner / gameSeq`。
- `peekOrder`：本局看词顺序（玩家 id，开局随机生成一次，与名单顺序无关；PRD §9-15）；
- `voteOrder`：当前轮投票顺序（玩家 id，每轮开始时重新洗牌；平票重投沿用本轮；出局者随新一轮只洗存活者而自动移除）。
**Phase（状态机阶段，与 02-design 页面一一对应；无描述相位）**：

| Phase | 对应页面 | 关键字段 |
|---|---|---|
| `peek(index, revealed)` | P4 态 A/B | index 为 peekOrder 中的位置；revealed=false 态 A 交接；true 态 B 显词 |
| `peekDone` | P4 态 C | 全员看完 → 直接引导开始投票 |
| `vote(index, confirmed, tiebreak)` | P6 态 A/B | index 为 voteOrder 中的位置；confirmed=false 交接；true 选票；tiebreak=true 平票重投轮（沿用本轮顺序） |
| `voteResult(tiebreak)` | P7 | — |
| `tieAnnounce` | P9 第一屏 | tiebreakIds=平票者（公告后全员直接重投一次） |
| `tieStuck` | P9 第二屏（仍平票） | noExitStreak 累加、≥3 触发 M2 |
| `reveal(eliminatedId, flipped)` | P8 两段式 | flipped=false 先亮人 |
| `final` | P10 | winner 阵营 |

### 3.2 本机持久化（localStorage，版本化）

- Key：`family-undercover:store`，值结构：

```ts
interface AppStore {
  v: 1;                                     // 版本号，升级时写迁移
  profiles: Record<string, Profile>;        // key = `${name}#${avatarId}`
  recentPairs: string[];                    // 最近用过的词对 id（≤10），连局避重
}
interface Profile { name: string; avatarId: string; games: number; wins: number; }
```

- 读写策略：读取时 JSON 解析 + 逐字段校验（类型/范围），任何异常（禁用/损坏/版本不符）→ 回退空档并覆盖写；写入 try/catch，失败向上返回布尔并由 App Toast「战绩保存失败」（不吞异常、不死路）。
- **局状态不持久化**：刷新/关闭即回 P1（PRD §8）。
- 迁移约定：未来改结构时递增 `v` 并在读取处按旧版本迁移；未知版本丢弃重建。

## 4. 状态管理与「接口」设计（纯前端，无 HTTP API）

对外输入只有两类：触屏事件（→ dispatch 动作）与 localStorage（→ storage 模块）。动作清单（reducer 的全部入口）：

| Action | 载荷 | 语义与守卫 |
|---|---|---|
| `START_GAME` | roster, mode, assignment, rng | 进入 P4（App 先经 setup.validate + dealer 发词）；按 rng 洗出 peekOrder（PRD §9-15） |
| `PEEK_CONFIRM` / `PEEK_HIDE` | — | 态 A→B；B→下一位 A 或 peekDone |
| `START_VOTE` | rng | P4-C → P6（看词完成直接投票，无描述环节）；按 rng 洗出首轮 voteOrder |
| `VOTER_CONFIRM` / `VOTE_CAST` | targetId | P6 两态；投票人按 voteOrder 轮转；VOTE_CAST 校验目标为存活他人，非法即抛错（E1 兜底） |
| `PROCEED_FROM_RESULT` | — | P7 计票：唯一最高→P8；平票→P9（首投平票→全员重投 / 重投仍平→无人出局） |
| `START_TIEBREAK` / `TIE_STUCK_NEXT` | TIE_STUCK_NEXT 带 rng | P9 两段推进：全员直接重投一次（可换票，**沿用本轮 voteOrder 不重排**）/ 仍平票进入下一轮（按 rng 重排 voteOrder） |
| `FLIP_IDENTITY` / `CONTINUE_AFTER_REVEAL` | CONTINUE_AFTER_REVEAL 带 rng | P8 翻牌（只亮身份不亮词）；继续时按 §3.4 判定胜负（未分胜负→下一轮直接投票，按 rng 重排存活者 voteOrder） |
| `REDEAL` | assignment, rng | 「再来一局 / 重开本局」重发词（gameSeq+1），并重新随机 peekOrder |
| `FALLBACK_CONTINUE` | — | M2「商量好了，下一轮」 |

计分副作用（App 层 useEffect，以 gameSeq 去重）：进入 `final` 时对获胜阵营全部成员（含已出局）`wins+1`、全体参与者 `games+1`；每次发词将 pairId 推入 recentPairs（去重、截断至 10）。

## 5. 交互设计实现映射（02-design → 代码）

| 设计 | 实现落点 | 备注 |
|---|---|---|
| P0 骼屏 | App 内 splash 态（≤1s CSS 过渡） | reduced-motion 降级为快速淡出 |
| P1 首页 | `views/HomeView.tsx` | 开始游戏/排行榜/怎么玩（静态 Sheet）|
| P2 设置 | `views/SetupView.tsx` + `game/setup.ts` | 默认简单模式、预填 4 家人、全部边界（§3.7）由 setup.ts 纯函数裁决 |
| S1 头像弹层 | `views/AvatarPickerSheet.tsx` + `avatars/catalog.ts` | 4 原创置顶 + 5 分组 emoji；已选置灰✓；🎲 随机（含未占用原创） |
| P4 看词 | `views/PeekView.tsx` | 三态；翻牌 500ms；隐藏后词不渲染（结构性防回看）；态 C 直接引导「开始投票」；交接卡与进度头像条按本局随机序 peekOrder（v0.3.0） |
| P6 投票 | `views/VoteView.tsx` | 交接/选票两态；候选=除己存活；交接卡、进度条与候选卡均按当轮随机序 voteOrder（v0.3.0）；局外灰显；平票重投轮顶部标注「🔄 重新投票 · 可以换票」（顺序沿用本轮），下一轮显示「第 N 轮 · 还剩 X 人」横幅（顺序已重排） |
| P7 公示 | `views/VoteResultView.tsx` | 得票条形降序 + 谁投谁明细（票序=当轮 voteOrder）；平票行黄描边、按钮变「重新投一次 ▶」 |
| P8 揭晓 | `views/RevealView.tsx` | 两段式 + 3D 翻身份卡；**只亮身份不亮词**——第二段身份卡仅头像/名字/身份三要素 + 保密提示「词语会在终局揭晓，别急 👀」（v0.3.0，按 p08b） |
| P9 平票 | `views/TieView.tsx` + machine tieAnnounce/tieStuck | 平票公告（并列者票数）→ 全员直接重投一次（可换票）；仍平票宣布无人出局；M2 兜底=Modal 覆盖层 |
| P10 结算 | `views/FinalView.tsx` | confetti（胜方配色）、词对照（**词语唯一公开时机**，v0.3.0 保留不变）、+1 胜黄标、再来一局（「换新词啦」1s 过渡） |
| P11 排行榜 | `views/LeaderboardView.tsx` + storage 排序 | 胜场→胜率→局数→昵称 决胜排序 |
| M1/M2/T1/E1/Banner | `ui/Modal.tsx` / `ui/Toast.tsx` / ErrorBoundary / `ui/Banner.tsx` | 清空战绩与重开本局均二次确认 |

偏差记录（详见 §9）：① 「动画角色」分类以原创角色原型词对呈现（公主/巫师/忍者等），不含任何版权角色名，以同时满足 PRD M2 分类与版权红线；② ink/2 色微调加深（#9C8B7E→#8A786A）满足 4.5:1 对比度验收线（设计文档明示允许）。

## 6. 内容资产方案

### 6.1 词库（src/game/wordBank.ts）

- 规模 **110 对**：5 分类 × (简单 10 对 + 普通 12 对) = 5×22；简单池 50 对、普通池 60 对，全部儿童适宜（无成人向/恐怖/敏感/商标词），逐条人工整理、随代码交付可 review（`wordBank.ts` 即清单，含分类/难度注释）。
- id 规则 `<category>-<e|n><序号>`；约束（有单测保证）：每对 civilian≠undercover、id 唯一、全部词语在全库不重复出现、两词均为 1-4 字常用词。

### 6.2 头像（src/avatars/）

- 共 **54 个 = 4 原创 SVG + 50 emoji**（动物/食物/表情/物品/幻想 5 组 × 10）≥ PRD 的 52 个。
- 原创头像按 `docs/mockups/p02-setup.svg`/`s01-avatar-picker.svg` 的绘制 1:1 提取为 React SVG 组件（40×40 viewBox）：`nuandad 暖爸`、`tianma 甜妈`、`pixelkid 像素小子`、`pinkbunny 粉兜兔`；命名与形象均为原创，不含任何版权角色/商标（PRD §9-11）。
- 每个头像绑定固定浅色圆底（专属感），占用规则全库一致：已被选即置灰 + ✓ 不可点。

## 7. 任务拆解（有序，含完成标准）

| # | 任务 | 内容 | 完成标准（可验证） |
|---|---|---|---|
| T1 | 纯逻辑层 | types/rng/wordBank/dealer/tally/referee/setup/copy | `npm test` 中对应单测全绿（发词分配/计票/平票/胜负/计分/边界） |
| T2 | 状态机 | machine.ts 全部 Action 与守卫 | machine.test.ts 覆盖：3 人局全流程、平票两段、3 轮兜底、重开/连局 |
| T3 | 持久化 | appStore.ts 版本化读写与排序 | storage.test.ts：损坏回退、计分累计、清空、排行排序 |
| T4 | 基础 UI 与样式 | global.css token/组件样式/动效 + ui/* | build 通过；对照 mockup 逐页走查（自测清单） |
| T5 | 视图层 | 11 视图 + 2 弹层 + App 编排 | app.smoke / setupBoundary 冒烟测试通过 |
| T6 | 打磨 | 离线 SW、favicon、README、.env.example | `npm run build && npm run preview` 可访问；SW 注册仅生产 |
| T7 | 全量自测 | 验收命令 + 关键路径冒烟 | §8 全部通过 |

## 8. 验收命令（真实可跑）

```bash
cd apps/family-undercover
npm install
npm run build     # tsc -b 类型检查 + vite 生产构建
npm test          # vitest run：纯逻辑单测 + jsdom 冒烟（3 人简单局全程 / 6 人边界）
npm run lint      # eslint .
npm run preview   # 本地起静态服务人工走查
```

关键路径冒烟（自动化于 `src/__tests__/app.smoke.test.tsx`、`setupBoundary.smoke.test.tsx` 与 `qa.tie-fallback.test.tsx`）：
1. 首页→设置（预填 4 人、默认简单）→开局→逐人「是我，看词→记住啦，隐藏」（校验隐藏后词从 DOM 消失）→直接开始投票（无描述步）→逐人投票→公示→揭晓→直至结算→再来一局；
2. 平票场景：首投平票→P9 公告→全员直接重投一次（可换票）→唯一最高出局 / 仍平票无人出局进入下一轮；连续 3 轮无人出局触发 M2 兜底；
3. 简单模式加至 6 人→点添加被拦（横幅+一键切普通）→切换后名单保留→可加第 7 人→>6 人切回简单被拦。

## 9. 部署方案与环境变量清单

- **部署形态**：纯静态产物（`dist/`），Vite `base: './'` 相对路径，适配任意静态托管的子路径。
- **推荐路径（免费档，二选一）**：
  - GitHub Pages：`apps/family-undercover` 作为仓库根，Actions 构建 `dist` 发布即可（`base './'` 兼容 `/repo/` 子路径）；
  - Vercel：Framework 选 Vite、构建 `npm run build`、输出 `dist`，零配置。
- **环境变量清单：空**。本项目运行期零网络请求、零后端、零密钥（PRD §8），`.env.example` 已注明占位约定。发布与上线动作由发布与运维 agent 执行（本阶段不做）。

## 10. 风险与平台边界

1. **离线首开**：Web 平台无法在「从未访问过」的设备上离线打开页面——SW 缓存保证「访问过一次后完全离线可玩」，这是浏览器平台的固有限制（家庭场景通常先在有网时打开链接，随后全程断网可玩，满足 PRD 场景）。
2. **localStorage 可用性**：隐私模式/禁用存储时战绩不可用——读取失败回退内存空档并 Toast 提示，游戏主流程不受影响（仅战绩不累计）。
3. **iOS Safari 100vh 问题**：布局用 `100dvh` + 安全区 padding，避免底栏按钮被手势条遮挡。
4. **词库后续扩充**：wordBank.ts 为纯数据文件，追加词对只需按 id 规则新增（单测自动校验约束）。
5. **测试环境的 localStorage**：Node ≥22 自带实验性 `globalThis.localStorage`（未开 `--localstorage-file` 时为 undefined），会遮蔽 vitest jsdom 注入的 localStorage——已在 `src/test/setup.ts` 用内存实现补齐（仅测试环境，生产行为不受影响）。

## 11. 与 PRD/设计的偏差汇总

| # | 偏差 | 理由 |
|---|---|---|
| 1 | 「动画角色」分类的词对使用原创角色原型（公主/王子、巫师/魔法师、忍者/武士等） | PRD 版权红线（§9-11）禁用任何版权角色名与商标；原型词对既满足「动画角色」的分类语义，又保证开源合规 |
| 2 | ink/2 辅助色由 #9C8B7E 微调加深至 #8A786A | 02-design §1.2 明示「色值开发时可微调加深，对比度是验收线」（4.5:1） |
| 3 | 其余无偏差 | 12 视图、2 弹层、10 流程、玩法规则（含平票/胜负/计分/边界/兜底）均按 PRD §3 与 02-design 原样实现 |
