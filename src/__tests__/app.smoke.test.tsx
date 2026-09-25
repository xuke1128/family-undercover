import { describe, expect, it, vi } from 'vitest';
import { render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../game/types';

/**
 * 关键路径冒烟：4 人（默认预填）简单模式完整一局（PRD §5 交付口径）。
 * 用固定发词替代随机（妈妈=卧底，词对 包子/饺子），驱动完整流程：
 * 看词防偷看（顺序随机）→ 直接开始投票（无描述环节，每轮顺序随机）→ 逐人投票 →
 * 公示 → 揭晓（只亮身份不亮词）→ 结算（词对照公开）→ 连局 / 战绩入档。
 * v0.3.0：看词与投票顺序均为随机序，全程动态读取交接卡目标推进。
 */
vi.mock('../game/dealer', () => ({
  dealGame: (roster: Player[]) => ({
    pair: { id: 'food-e3', category: 'food' as const, difficulty: 'easy' as const, civilian: '饺子', undercover: '包子' },
    roles: Object.fromEntries(roster.map((p, i) => [p.id, i === 1 ? ('undercover' as const) : ('civilian' as const)])),
  }),
  pushRecentPair: (recent: string[], id: string) => [id, ...recent.filter((r) => r !== id)].slice(0, 10),
  RECENT_PAIR_LIMIT: 10,
}));

import App from '../App';

const names = ['爸爸', '妈妈', '哥哥', '妹妹'];
const wordOfName = (name: string) => (name === '妈妈' ? '包子' : '饺子');

/** 读取当前交接卡上的玩家名（看词/投票顺序随机后无法预言，只能动态读取） */
const handoffName = (): string => {
  const name = document.querySelector('.handoff__name')?.textContent;
  if (!name) throw new Error('交接卡上没有玩家名');
  return name;
};

/** 驱动一局到终局结算页 */
async function playToFinal(): Promise<{ user: ReturnType<typeof userEvent.setup>; view: RenderResult }> {
  const user = userEvent.setup();
  const view = render(<App />);

  const startBtn = await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 });
  await user.click(startBtn);

  // P2：默认预填 4 位家人、简单模式默认选中，直接开局
  expect(await screen.findByText('玩家 4/6')).toBeVisible();
  expect(screen.getByRole('radio', { name: '🍬 简单模式' })).toHaveAttribute('aria-checked', 'true');
  await user.click(screen.getByRole('button', { name: '开始游戏' }));

  // P4：逐人「是我，看词 → 显词 → 记住啦，隐藏」；顺序为本局随机看词序
  const peeked: string[] = [];
  for (let i = 0; i < names.length; i++) {
    expect(await screen.findByText('下一个是')).toBeVisible();
    const name = handoffName();
    peeked.push(name);
    const word = wordOfName(name);
    await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
    expect(await screen.findByText(word)).toBeVisible();
    expect(screen.getByText(`${name}，这是你的词`)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
    expect(screen.queryByText(word)).not.toBeInTheDocument(); // 防偷看：词消失
  }
  expect([...peeked].sort()).toEqual([...names].sort()); // 随机序：全员各看一次、无人遗漏

  // P4 态 C：全员看完 → 直接开始投票（2026-09-21 修订：无描述环节，家人面对面自由交流）
  expect(await screen.findByText('词都记住啦！')).toBeVisible();
  expect(screen.getByText('聊一聊，再来投票')).toBeVisible(); // 简单模式短文案
  expect(screen.queryByRole('button', { name: '开始描述 🎤' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));

  // P6：逐人秘密投票（顺序为第 1 轮随机序；除妈妈本人外全部投妈妈，妈妈投爸爸）
  const voteSeq: string[] = [];
  for (let i = 0; i < names.length; i++) {
    expect(await screen.findByText('下一个是')).toBeVisible();
    const voter = handoffName();
    voteSeq.push(voter);
    await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
    expect(await screen.findByText(`${voter}，你觉得谁是卧底？`)).toBeVisible();
    const target = voter === '妈妈' ? '爸爸' : '妈妈';
    await user.click(screen.getByRole('radio', { name: target }));
    await user.click(screen.getByRole('button', { name: `投给 ${target}` }));
  }
  expect([...voteSeq].sort()).toEqual([...names].sort()); // 本轮随机序恰为全员各投一次

  // P7：票型公示 → 揭晓
  expect(await screen.findByText('投票结果 🗳️')).toBeVisible();
  expect(screen.getByText('大家是这样投的：')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '揭晓出局者 ▶' }));

  // P8：两段式揭晓（妈妈=卧底）；v0.3.0 只亮身份、不亮词
  expect(await screen.findByText('出局的是……')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
  expect(await screen.findByText('🎭 卧底！')).toBeVisible();
  expect(screen.queryByText(/他的词/)).not.toBeInTheDocument(); // 揭晓页不再报词
  expect(screen.queryByText('包子')).not.toBeInTheDocument();
  expect(screen.getByText('词语会在终局揭晓，别急 👀')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '继续 ▶' }));

  // P10：平民胜利
  expect(await screen.findByText('🎉 平民胜利！')).toBeVisible();
  return { user, view };
}

describe('关键路径冒烟：4 人简单局全程', () => {
  it('结算页呈现胜负/词对照/+1 胜标记，战绩入档，排行榜可查', async () => {
    await playToFinal();

    expect(screen.getByText('平民词：饺子')).toBeVisible();
    expect(screen.getByText('卧底词：包子')).toBeVisible();
    expect(screen.getAllByText('✪ +1胜')).toHaveLength(3); // 平民 3 人（含出局者口径不适用本局）

    // 战绩入档（本机保存）+ 近期词对记录
    const raw = window.localStorage.getItem('family-undercover:store');
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!) as {
      profiles: Record<string, { name: string; avatarId: string; games: number; wins: number }>;
      recentPairs: string[];
    };
    expect(saved.profiles['爸爸#custom:nuandad']).toEqual({
      name: '爸爸',
      avatarId: 'custom:nuandad',
      games: 1,
      wins: 1,
    });
    expect(saved.profiles['妈妈#custom:tianma']).toMatchObject({ games: 1, wins: 0 });
    expect(saved.recentPairs[0]).toBe('food-e3');

    // 排行榜：3 位 1 胜 + 妈妈 0 胜
    await screen.getByRole('button', { name: '🏆 排行榜' }).click();
    expect(await screen.findByText('按胜场排序，同胜场看胜率')).toBeVisible();
    expect(screen.getAllByText('1 胜 / 1 局')).toHaveLength(3);
    expect(screen.getByText('0 胜 / 1 局')).toBeVisible();
  }, 30000);

  it('再来一局：换新词过渡 → 回到看词页（名单/模式沿用，看词顺序重排）', async () => {
    const { user } = await playToFinal();
    await user.click(screen.getByRole('button', { name: '🔁 再来一局' }));
    expect(await screen.findByText('换新词啦', {}, { timeout: 2500 })).toBeVisible();
    expect(await screen.findByRole('button', { name: '是我，看词 🙈' }, { timeout: 2500 })).toBeVisible();
    expect(screen.getByText('下一个是')).toBeVisible();
    expect(names).toContain(handoffName()); // 看词顺序重新随机，首个人不固定
  }, 30000);
});
