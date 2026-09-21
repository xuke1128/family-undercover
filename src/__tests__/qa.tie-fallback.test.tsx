import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../game/types';

/**
 * QA 补充：平票两段流程与 3 轮兜底的 UI 级验证（US7，PRD §3.3）。
 * 现有 machine.test 已覆盖状态机层面，此处经真实 UI 驱动完整链路：
 * - 首投平票 → P9 公告（并列者票数）→ 仅平票者加赛描述 → 全员重投 → 唯一最高出局；
 * - 重投仍平票 → 本轮无人出局 → 下一轮全员描述；
 * - 出局者不在后续轮次与候选中（灰显「已出局」）；
 * - 连续 3 轮无人出局 → M2 兜底弹层 → 重开本局（M1 二次确认）→ 回到看词且不计战绩。
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

async function startGame(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
  expect(await screen.findByText('玩家 4/6')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始游戏' }));
}

/** 全员看词并进入描述轮 */
async function peekAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (const name of names) {
    expect(await screen.findByText('下一个是')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
    expect(await screen.findByText(`${name}，这是你的词`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
  }
  expect(await screen.findByText('词都记住啦！')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始描述 🎤' }));
}

/** 当前描述轮走完并点「开始投票 / 重新投票」 */
async function describeAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    if (screen.queryByRole('button', { name: '说完啦，下一位 →' })) {
      await user.click(screen.getByRole('button', { name: '说完啦，下一位 →' }));
      continue;
    }
    const toVote =
      screen.queryByRole('button', { name: '开始投票 🗳️' }) ?? screen.queryByRole('button', { name: '重新投票 🗳️' });
    if (toVote) {
      await user.click(toVote);
      return;
    }
    if (screen.queryByRole('button', { name: '是我，投票 🤫' })) return; // 已在投票交接态
    throw new Error('describeAll：意外的界面状态');
  }
  throw new Error('describeAll：推进次数超限');
}

/** 逐人投票直到离开投票环节；targetOf = 投票人昵称 -> 被投者昵称（兼容已确认的选票态） */
async function voteAll(
  user: ReturnType<typeof userEvent.setup>,
  targetOf: (voter: string) => string,
): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    const header = screen.queryByText(/，你觉得谁是卧底？/);
    if (!header) {
      const confirm = screen.queryByRole('button', { name: '是我，投票 🤫' });
      if (!confirm) return; // 全员投完，进入票型公示
      await user.click(confirm);
      continue;
    }
    const voter = (header.textContent ?? '').split('，')[0];
    const target = targetOf(voter);
    await user.click(screen.getByRole('radio', { name: target }));
    await user.click(screen.getByRole('button', { name: `投给 ${target}` }));
  }
  throw new Error('voteAll：投票人数超限');
}

/** 走完一轮「首投平票 → 加赛 → 重投仍平票 → 无人出局 → 下一轮全员描述」 */
async function stuckRound(user: ReturnType<typeof userEvent.setup>, tieMap: (voter: string) => string): Promise<void> {
  await describeAll(user);
  await voteAll(user, tieMap);
  await user.click(await screen.findByRole('button', { name: '平票了，看看怎么办 ▶' }));
  expect(await screen.findByText('平票啦！')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '开始加赛 🎤' }));
  await describeAll(user);
  await voteAll(user, tieMap);
  await user.click(await screen.findByRole('button', { name: '平票了，看看怎么办 ▶' }));
  expect(await screen.findByText('还是平票')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '下一轮 ▶' }));
}

describe('QA 平票两段流程（PRD §3.3）', () => {
  it('首投平票 → 仅平票者加赛 → 重投唯一最高出局 → 下一轮不含出局者', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);

    // 第 1 轮：爸爸 2 票、妈妈 2 票平票（无人投自己）
    const tieMap = (voter: string) => (voter === '爸爸' || voter === '哥哥' ? '妈妈' : '爸爸');
    await describeAll(user);
    await voteAll(user, tieMap);

    // P9 第一屏：并列者及票数 + 简单模式短文案
    await user.click(await screen.findByRole('button', { name: '平票了，看看怎么办 ▶' }));
    expect(await screen.findByText('平票啦！')).toBeVisible();
    expect(screen.getByText('爸爸 2 票')).toBeVisible();
    expect(screen.getByText('妈妈 2 票')).toBeVisible();
    expect(screen.getByText('他们再说一句，大家再投一次')).toBeVisible();

    // 加赛：横幅 + 仅平票者（爸爸、妈妈，按座位序）在轮次中
    await user.click(screen.getByRole('button', { name: '开始加赛 🎤' }));
    expect(await screen.findByText('⚖️ 平票加时赛：只听下面的人再各说一句')).toBeVisible();
    expect(screen.getByText('第 1/2 位')).toBeVisible();
    expect(screen.getByText('轮到爸爸描述啦')).toBeVisible();

    await describeAll(user);
    // 重投环节：先经交接确认，选票页带「重新投票」标注
    await user.click(await screen.findByRole('button', { name: '是我，投票 🤫' }));
    expect(await screen.findByText('⚖️ 重新投票')).toBeVisible();
    // 重投集中投哥哥（哥哥本人投爸爸）→ 唯一最高 3 票
    await voteAll(user, (voter) => (voter === '哥哥' ? '爸爸' : '哥哥'));
    await user.click(await screen.findByRole('button', { name: '揭晓出局者 ▶' }));

    // 出局的是哥哥（平民），游戏继续进入第 2 轮
    expect(await screen.findByText('出局的是……')).toBeVisible();
    expect(screen.getByText('哥哥')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
    expect(await screen.findByText('🌱 平民')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '继续 ▶' }));
    expect(await screen.findByText(/第 2 轮 · 描述（还剩 3 人）/)).toBeVisible();

    // 第 2 轮：描述轮次不含哥哥；投票候选不含哥哥（灰显已出局）
    await describeAll(user);
    expect(screen.queryByText('轮到哥哥描述啦')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
    expect(await screen.findByText('爸爸，你觉得谁是卧底？')).toBeVisible();
    expect(screen.queryByRole('radio', { name: '哥哥' })).not.toBeInTheDocument();
    expect(screen.getByText('已出局：')).toBeVisible();

    // 第 2 轮 3 人循环互投 → 平票 → 加赛 → 重投仍平票 → 无人出局进入第 3 轮
    const cycle3 = (voter: string) => (voter === '爸爸' ? '妈妈' : voter === '妈妈' ? '妹妹' : '爸爸');
    await voteAll(user, cycle3);
    await user.click(await screen.findByRole('button', { name: '平票了，看看怎么办 ▶' }));
    await user.click(await screen.findByRole('button', { name: '开始加赛 🎤' }));
    await describeAll(user);
    await voteAll(user, cycle3);
    await user.click(await screen.findByRole('button', { name: '平票了，看看怎么办 ▶' }));
    expect(await screen.findByText('还是平票')).toBeVisible();
    expect(screen.getByText('这轮没人出局，再来！')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一轮 ▶' }));
    expect(await screen.findByText(/第 3 轮 · 描述（还剩 3 人）/)).toBeVisible();
  }, 120000);
});

describe('QA 连续 3 轮无人出局的兜底与重开（PRD §3.3 兜底 / M2）', () => {
  it('第 3 次仍平票弹出 M2 → 重开本局经 M1 确认 → 回到看词页且不计战绩', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startGame(user);
    await peekAll(user);

    // 4 人两两互投：爸爸/妈妈各 2 票、哥哥/妹妹各 2 票，首投与重投均平票 → 每轮无人出局
    const tieMap = (voter: string) =>
      voter === '爸爸' ? '妈妈' : voter === '妈妈' ? '爸爸' : voter === '哥哥' ? '妹妹' : '哥哥';

    // 连续 3 轮无人出局；前两轮不出现兜底弹层
    await stuckRound(user, tieMap);
    expect(await screen.findByText('第 2 轮 · 描述')).toBeVisible();
    expect(screen.queryByText('😵 连续 3 轮没人出局')).not.toBeInTheDocument();
    await stuckRound(user, tieMap);
    expect(await screen.findByText('第 3 轮 · 描述')).toBeVisible();
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

    // 回到看词页（名单不变、重新发词、从头看词）
    expect(await screen.findByRole('button', { name: '是我，看词 🙈' })).toBeVisible();
    expect(screen.getByText('下一个是')).toBeVisible();
    expect(screen.getByText('爸爸')).toBeVisible();
    expect(screen.getByText('看词 1/4')).toBeVisible();
    expect(screen.queryByText('😵 连续 3 轮没人出局')).not.toBeInTheDocument();

    // 重开的局不计战绩：档案为空（localStorage 仅记录了近期词对）
    const saved = JSON.parse(window.localStorage.getItem('family-undercover:store') ?? '{}') as {
      profiles: Record<string, unknown>;
    };
    expect(saved.profiles).toEqual({});
  }, 120000);
});
