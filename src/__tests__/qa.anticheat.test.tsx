import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../game/types';

/**
 * QA 补充：防偷看结构性验证（US3 / 02-design F2 硬性约束、DP3）。
 * 现有 app.smoke 已验证「隐藏后词消失」，此处补齐：
 * - 交接态 A（未确认身份）时任何玩家的词都不在 DOM；
 * - 看词完成过渡 / 投票交接 / 投票选票 / 票型公示各屏均无词语（词仅存在于看词态 B 与终局结算）；
 * - 局内（P4-P7）无任何返回/回首页导航；
 * - 投票候选不含自己（按本轮随机序动态校验每位投票人）；
 * - v0.3.0（PRD §9-14）：出局揭晓只亮身份、不亮词——卧底出局与平民出局两种情形下，
 *   揭晓页均不含任何词语；终局结算页词对照保留（词语唯一公开时机）。
 */
vi.mock('../game/dealer', () => ({
  dealGame: (roster: Player[]) => ({
    pair: { id: 'animal-e1', category: 'animal' as const, difficulty: 'easy' as const, civilian: '猫', undercover: '狗' },
    roles: Object.fromEntries(roster.map((p, i) => [p.id, i === 1 ? ('undercover' as const) : ('civilian' as const)])),
  }),
  pushRecentPair: (recent: string[], id: string) => [id, ...recent.filter((r) => r !== id)].slice(0, 10),
  RECENT_PAIR_LIMIT: 10,
}));

import App from '../App';

const names = ['爸爸', '妈妈', '哥哥', '妹妹'];
const WORDS = ['猫', '狗'];
const wordOfName = (name: string) => (name === '妈妈' ? '狗' : '猫');

const handoffName = (): string => {
  const name = document.querySelector('.handoff__name')?.textContent;
  if (!name) throw new Error('交接卡上没有玩家名');
  return name;
};

const expectNoWordAnywhere = () => {
  for (const w of WORDS) {
    expect(screen.queryByText(w, { exact: false }), `界面不应出现词「${w}」`).not.toBeInTheDocument();
  }
  // 揭晓页旧版「他的词：××」句式同样视为泄词
  expect(screen.queryByText(/他的词/)).not.toBeInTheDocument();
};

const expectNoBackNavigation = () => {
  expect(screen.queryByRole('button', { name: '回首页' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '返回' })).not.toBeInTheDocument();
};

/** 开局：首页 → 设置（默认 4 人简单模式）→ 进入看词 */
async function startGame(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
  expect(await screen.findByText('玩家 4/6')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始游戏' }));
}

/** 按本局随机看词序逐人看词；每次交接屏与隐藏后均无任何词 */
async function peekAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const peeked: string[] = [];
  for (let i = 0; i < names.length; i++) {
    expect(await screen.findByText('下一个是')).toBeVisible();
    const name = handoffName();
    peeked.push(name);
    expectNoWordAnywhere();
    expectNoBackNavigation();
    await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
    expect(await screen.findByText(wordOfName(name))).toBeVisible(); // 态 B：仅本人见词
    await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
    expectNoWordAnywhere(); // 隐藏后立即消失
  }
  expect([...peeked].sort()).toEqual([...names].sort());
}

/** 按本轮随机投票序逐人投票（交接屏无词），返回交接序列 */
async function voteAll(
  user: ReturnType<typeof userEvent.setup>,
  targetOf: (voter: string) => string,
): Promise<string[]> {
  const order: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const header = screen.queryByText(/，你觉得谁是卧底？/);
    if (header) {
      const voter = (header.textContent ?? '').split('，')[0];
      const target = targetOf(voter);
      await user.click(screen.getByRole('radio', { name: target }));
      await user.click(screen.getByRole('button', { name: `投给 ${target}` }));
      continue;
    }
    const confirm = screen.queryByRole('button', { name: '是我，投票 🤫' });
    if (!confirm) {
      if (order.length === 0) throw new Error('voteAll：未进入投票环节');
      return order;
    }
    expect(await screen.findByText('下一个是')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();
    order.push(handoffName());
    await user.click(confirm);
  }
  throw new Error('voteAll：投票人数超限');
}

describe('QA 防偷看与局内导航（US3/DP3）', () => {
  it('词仅在看词态 B 渲染；其余各屏无词、无返回导航；候选不含自己；卧底出局揭晓不亮词；终局词对照保留', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);

    // P4 态 C（看词完成过渡）：无词、无返回；直接开始投票（无描述环节）
    expect(await screen.findByText('词都记住啦！')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();
    expect(screen.queryByRole('button', { name: '开始描述 🎤' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));

    // P6：按本轮随机序逐人投票；每位投票人的候选均不含自己，交接/选票屏均无词
    const targetOf = (voter: string) => (voter === '妈妈' ? '爸爸' : '妈妈');
    const ballotChecks = async (voter: string) => {
      expect(await screen.findByText(`${voter}，你觉得谁是卧底？`)).toBeVisible();
      expectNoWordAnywhere();
      expect(screen.queryByRole('radio', { name: voter })).not.toBeInTheDocument();
      for (const other of names.filter((n) => n !== voter)) {
        expect(screen.getByRole('radio', { name: other })).toBeEnabled();
      }
    };
    const voteSeq: string[] = [];
    for (let i = 0; i < names.length; i++) {
      expect(await screen.findByText('下一个是')).toBeVisible();
      const voter = handoffName();
      voteSeq.push(voter);
      await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
      await ballotChecks(voter);
      const target = targetOf(voter);
      await user.click(screen.getByRole('radio', { name: target }));
      await user.click(screen.getByRole('button', { name: `投给 ${target}` }));
    }
    expect([...voteSeq].sort()).toEqual([...names].sort());

    // P7 票型公示：无词、无返回；4 行「谁投谁」明细（按本轮投票序）
    expect(await screen.findByText('投票结果 🗳️')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();
    expect(screen.getByText('大家是这样投的：')).toBeVisible();

    // P8 第一段（先亮人）：无词
    await user.click(screen.getByRole('button', { name: '揭晓出局者 ▶' }));
    expect(await screen.findByText('出局的是……')).toBeVisible();
    expectNoWordAnywhere();

    // P8 第二段（v0.3.0）：卧底出局只亮身份、不亮词
    await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
    expect(await screen.findByText('🎭 卧底！')).toBeVisible();
    expectNoWordAnywhere();
    expect(screen.getByText('词语会在终局揭晓，别急 👀')).toBeVisible();

    // P10 结算：全员身份与词公开（终局是词语唯一公开时机，按新规则保留）
    await user.click(screen.getByRole('button', { name: '继续 ▶' }));
    expect(await screen.findByText('🎉 平民胜利！')).toBeVisible();
    expect(screen.getByText('平民词：猫')).toBeVisible();
    expect(screen.getByText('卧底词：狗')).toBeVisible();
    expect(screen.getAllByText('词语：猫')).toHaveLength(3);
    expect(screen.getAllByText('词语：狗')).toHaveLength(1);
  }, 30000);

  it('平民出局揭晓同样只亮身份、不亮词（v0.3.0：无论谁出局一律不报词）', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);
    await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));

    // 全员投爸爸（平民），爸爸本人投妈妈 → 爸爸 3 票唯一最高出局
    await voteAll(user, (voter) => (voter === '爸爸' ? '妈妈' : '爸爸'));
    await user.click(await screen.findByRole('button', { name: '揭晓出局者 ▶' }));

    expect(await screen.findByText('出局的是……')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
    expect(await screen.findByText('🌱 平民！')).toBeVisible();
    expectNoWordAnywhere(); // 平民出局同样不亮词
    expect(screen.getByText('词语会在终局揭晓，别急 👀')).toBeVisible();

    // 平民出局未分胜负 → 下一轮投票交接（顺序重排、移除出局者）
    await user.click(screen.getByRole('button', { name: '继续 ▶' }));
    expect(await screen.findByText('第 2 轮 · 还剩 3 人')).toBeVisible();
    expect(await screen.findByText('下一个是')).toBeVisible();
    expectNoWordAnywhere();
    expect(names).toContain(handoffName());
  }, 30000);
});
