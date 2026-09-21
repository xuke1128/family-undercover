# 参与贡献

感谢关注「家庭卧底派对」！这是一个纯前端、零后端的合家欢传机小游戏，欢迎提交 Issue 与 PR。

## 本地开发

环境要求：Node ≥ 22。

```bash
npm install
npm run dev       # 本地开发
npm run lint      # eslint
npm test          # vitest（70 用例）
npm run build     # 类型检查 + 生产构建
```

提交 PR 前请确保以上命令全部通过。

## 贡献须知（项目红线）

- **内容合规**：词库与文案必须儿童适宜（无成人向 / 暴力 / 恐怖 / 敏感 / 商标词）。新增词对请在 `src/game/wordBank.ts` 按 id 规则（`<category>-<e|n><序号>`）追加——测试套件会自动校验 id 唯一性、两词不同且 1-4 个纯中文字符、全库不重复与黑名单
- **版权红线**：不引入任何第三方版权角色形象与商标名。头像与「动画角色」分类词对均须为原创原型（参考现有 4 个原创 SVG 头像的做法）
- **技术边界**：保持纯前端静态单页——零后端、零运行期网络请求、零密钥；战绩仅存 localStorage；不新增运行时依赖除非有充分理由并经讨论
- **防偷看约束**：词语文本仅允许出现在看词页「态 B」的渲染点。任何改动不得使词语出现在其它视图、不可因导航 / 刷新而回看

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：`feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:` 等，一行说明动机，必要时写 body。

## PR 流程

fork → 建分支（如 `feat-xxx` / `fix-xxx`）→ 改动 → 本地 lint / test / build 全绿 → 提交 PR（按模板自查）→ review 合并。

## 报告问题

请使用 Issue 模板（Bug 报告 / 功能建议），并注明机型与浏览器。涉及隐私的战绩截图请打码。
