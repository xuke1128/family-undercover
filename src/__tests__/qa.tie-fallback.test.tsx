import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../game/types';

/**
 * QA 补充：平票「全员直接重投一次」流程与 3 轮兜底的 UI 级验证（US6，PRD §3.3，2026-09-21 修订）。
 * 现有 machine.test 已覆盖状态机层面，此处经真实 UI 驱动完整链路：
 * - 首投平票 → P9 公告（并列者票数）→ 全员直接重投一次（可换票，无任何补充发言环节）→ 唯一最高出局；
 * - v0.3.0（PRD §9-15）：重投沿用本轮随机顺序——重投交接序列与首轮完全一致，不重排；
 * - 重投仍平票 → 本轮无人出局 → 直接进入下一轮投票（轮次横幅提示，顺序重排）；
 * - 出局者不在后续轮次与候选中（灰显「已出局」）；
 * - 连续 3 轮无人出局 → M2 兜底弹层 → 重开本局（M1 二次确认）→ 回到看词且不计战绩。
 * 看词/投票顺序随机后全程动态读取交接卡目标推进。
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

const handoffName = (): string => {
  const name = document.querySelector('.handoff__name')?.textContent;
  if (!name) throw new Error('交接卡上没有玩家名');
  return name;
};

async function startGame(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
  expect(await screen.findByText('玩家 4/6')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始游戏' }));
}

/** 按本局随机看词序逐人看词后直接开始投票（无描述环节） */
async function peekAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const peeked: string[] = [];
  for (let i = 0; i < names.length; i++) {
    expect(await screen.findByText('下一个是')).toBeVisible();
    const name = handoffName();
    peeked.push(name);
    await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
    expect(await screen.findByText(`${name}，这是你的词`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
  }
  expect([...peeked].sort()).toEqual([...names].sort());
  expect(await screen.findByText('词都记住啦！')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));
}

/**
 * 逐人投票直到离开投票环节，返回交接（投票）顺序。
 * targetOf = 投票人昵称 -> 被投者昵称；banner 指定时校验交接与选票两态均展示该横幅。
 */
async function voteAll(
  user: ReturnType<typeof userEvent.setup>,
  targetOf: (voter: string) => string,
  banner?: string,
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
      return order; // 全员投完，进入票型公示
    }
    if (banner) expect(screen.getByText(banner)).toBeVisible();
    order.push(handoffName());
    await user.click(confirm);
    if (banner) expect(screen.getByText(banner)).toBeVisible(); // 选票态同样展示
  }
  throw new Error('voteAll：投票人数超限');
}

/** 走完一轮「首投平票 → 全员直接重投仍平票 → 无人出局 → 进入下一轮」 */
async function stuckRound(user: ReturnType<typeof userEvent.setup>, tieMap: (voter: string) => string): Promise<void> {
  await voteAll(user, tieMap);
  await user.click(await screen.findByRole('button', { name: '重新投一次 ▶' }));
  expect(await screen.findByText('平票啦！')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '重新投票 🗳️' }));
  await voteAll(user, tieMap); // 重投（可换票，沿用本轮顺序），仍平票
  await user.click(await screen.findByRole('button', { name: '重新投一次 ▶' }));
  expect(await screen.findByText('还是平票')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '下一轮 ▶' }));
}

describe('QA 平票直接重投流程（PRD §3.3）', () => {
  it('首投平票 → 全员直接重投（顺序不变）→ 重投唯一最高出局 → 下一轮不含出局者', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);

    // 第 1 轮：爸爸 2 票、妈妈 2 票平票（无人投自己）
    const tieMap = (voter: string) => (voter === '爸爸' || voter === '哥哥' ? '妈妈' : '爸爸');
    const firstOrder = await voteAll(user, tieMap);
    expect([...firstOrder].sort()).toEqual([...names].sort());

    // P9 第一屏：并列者及票数 + 简单模式短文案；无任何补充发言环节
    await user.click(await screen.findByRole('button', { name: '重新投一次 ▶' }));
    expect(await screen.findByText('平票啦！')).toBeVisible();
    expect(screen.getByText('爸爸 2 票')).toBeVisible();
    expect(screen.getByText('妈妈 2 票')).toBeVisible();
    expect(screen.getByText('再投一次，可以换人')).toBeVisible();
    expect(screen.queryByRole('button', { name: '开始加赛 🎤' })).not.toBeInTheDocument();

    // 直接重投：交接卡与选票页均带「重新投票 · 可以换票」标注
    await user.click(screen.getByRole('button', { name: '重新投票 🗳️' }));
    expect(await screen.findByText('🔄 重新投票 · 可以换票')).toBeVisible();

    // v0.3.0（PRD §9-15）：重投沿用本轮顺序——交接序列与首轮完全一致，不重排
    const revoteOrder = await voteAll(user, (voter) => (voter === '哥哥' ? '爸爸' : '哥哥'), '🔄 重新投票 · 可以换票');
    expect(revoteOrder).toEqual(firstOrder);

    await user.click(await screen.findByRole('button', { name: '揭晓出局者 ▶' }));

    // 出局的是哥哥（平民），游戏继续进入第 2 轮；揭晓只亮身份不亮词
    expect(await screen.findByText('出局的是……')).toBeVisible();
    expect(screen.getByText('哥哥')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
    expect(await screen.findByText('🌱 平民！')).toBeVisible();
    expect(screen.queryByText(/他的词/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续 ▶' }));
    expect(await screen.findByText('第 2 轮 · 还剩 3 人')).toBeVisible();

    // 第 2 轮：投票候选不含哥哥（灰显已出局）
    expect(await screen.findByText('下一个是')).toBeVisible();
    const voter2 = handoffName();
    await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
    expect(await screen.findByText(`${voter2}，你觉得谁是卧底？`)).toBeVisible();
    expect(screen.queryByRole('radio', { name: '哥哥' })).not.toBeInTheDocument();
    expect(screen.getByText('已出局：')).toBeVisible();

    // 第 2 轮 3 人循环互投 → 平票 → 直接重投仍平票 → 无人出局进入第 3 轮
    const cycle3 = (voter: string) => (voter === '爸爸' ? '妈妈' : voter === '妈妈' ? '妹妹' : '爸爸');
    await voteAll(user, cycle3);
    await user.click(await screen.findByRole('button', { name: '重新投一次 ▶' }));
    await user.click(await screen.findByRole('button', { name: '重新投票 🗳️' }));
    await voteAll(user, cycle3);
    await user.click(await screen.findByRole('button', { name: '重新投一次 ▶' }));
    expect(await screen.findByText('还是平票')).toBeVisible();
    expect(screen.getByText('这轮没人出局，再来！')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一轮 ▶' }));
    expect(await screen.findByText('第 3 轮 · 还剩 3 人')).toBeVisible();
  }, 120000);
});

describe('QA 连续 3 轮无人出局的兜底与重开（PRD §3.3 兜底 / M2）', () => {
  it('第 3 次仍平票弹出 M2 → 重开本局经 M1 确认 → 回到看词页且不计战绩', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);

    // 4 人互投各得 1 票：首投与重投均平票 → 每轮无人出局
    const tieMap = (voter: string) =>
      voter === '爸爸' ? '妈妈' : voter === '妈妈' ? '爸爸' : voter === '哥哥' ? '妹妹' : '哥哥';

    // 连续 3 轮无人出局；前两轮不出现兜底弹层
    await stuckRound(user, tieMap);
    expect(await screen.findByText('第 2 轮 · 还剩 4 人')).toBeVisible();
    expect(screen.queryByText('😵 连续 3 轮没人出局')).not.toBeInTheDocument();
    await stuckRound(user, tieMap);
    expect(await screen.findByText('第 3 轮 · 还剩 4 人')).toBeVisible();
    expect(screen.queryByText('😵 连续 3 轮没人出局')).not.toBeInTheDocument();
    await stuckRound(user, tieMap);

    // 第 3 轮结束后：M2 兜底弹层出现
    expect(await screen.findByText('😵 连续 3 轮没人出局')).toBeVisible();
    expect(screen.getByText(/大家商量一下，直接指认一人/)).toBeVisible();

    // 重开本局：M1 二次确认（作废本局，防误触）
    await user.click(screen.getByRole('button', { name: '🔄 重开本局' }));
    expect(await screen.findByText('重开这一局？')).toBeVisible();
    expect(screen.getByText(/重开后本局作废（不计战绩）/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '确认重开' }));

    // 回到看词页（名单不变、重新发词、看词顺序重排）
    expect(await screen.findByRole('button', { name: '是我，看词 🙈' })).toBeVisible();
    expect(screen.getByText('下一个是')).toBeVisible();
    expect(names).toContain(handoffName());
    expect(screen.getByText('看词 1/4')).toBeVisible();
    expect(screen.queryByText('😵 连续 3 轮没人出局')).not.toBeInTheDocument();

    // 重开的局不计战绩：档案为空（localStorage 仅记录了近期词对）
    const saved = JSON.parse(window.localStorage.getItem('family-undercover:store') ?? '{}') as {
      profiles: Record<string, unknown>;
    };
    expect(saved.profiles).toEqual({});
  }, 120000);
});
