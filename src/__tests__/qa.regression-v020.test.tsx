import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  aliveIds,
  createInitialGame,
  FALLBACK_ROUNDS,
  gameReducer,
  playerById,
} from '../game/machine';
import type { Action } from '../game/machine';
import type { Assignment, GameMode, GameState, Player, Role } from '../game/types';
import { pairsByDifficulty } from '../game/wordBank';
import type { RNG } from '../game/rng';
import App from '../App';

/**
 * QA v0.2.0 回归补充（2026-09-21 修订验收，PRD §9 第 12 条）：
 * 1. machine：平票重投轮发生在「已有出局者」的轮次时，候选仍排除自己与已出局者
 *    （VOTE_CAST 对二者均抛错），重投唯一最高可正常出局并推进至终局；
 * 2. machine：「连续 3 轮无人出局」按连续语义累计——有人出局即归零重新累计，
 *    恰好在第 3 次连续无人出局时触发兜底（前 2 次不触发）；
 * 3. UI：普通模式与简单模式一致——看词完成页直接引导「开始投票」，
 *    无描述步按钮、无句式提示（简单模式已由 app.smoke / qa.anticheat 覆盖）。
 * v0.3.0：看词/投票顺序随机（PRD §9-15），全部按状态中的顺序动态驱动。
 */

// ---------- machine 层工具（与 machine.test.ts 同款，本地复制） ----------

const players = (names: string[]): Player[] =>
  names.map((name, i) => ({ id: `p${i + 1}`, name, avatarId: `emoji:e${i}` }));

/** 确定性 PRNG（mulberry32），与 machine.test.ts 同实现 */
const seededRng = (seed: number): RNG => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const assignment = (roster: Player[], undercoverNames: string[], difficulty: 'easy' | 'normal'): Assignment => {
  const roles: Record<string, Role> = {};
  for (const p of roster) roles[p.id] = undercoverNames.includes(p.name) ? 'undercover' : 'civilian';
  return { pair: pairsByDifficulty(difficulty)[0], roles };
};

const start = (names: string[], undercoverNames: string[], mode: GameMode): GameState => {
  const roster = players(names);
  return createInitialGame(roster, mode, assignment(roster, undercoverNames, mode === 'simple' ? 'easy' : 'normal'), seededRng(1));
};

const run = (state: GameState, ...actions: Action[]): GameState => {
  let s: GameState | null = state;
  for (const a of actions) {
    s = gameReducer(s, a);
    if (s === null) throw new Error('reducer 不应返回 null');
  }
  return s;
};

const beginGame = (names: string[], undercoverNames: string[], mode: GameMode = 'simple'): GameState => {
  let s = start(names, undercoverNames, mode);
  for (let i = 0; i < s.roster.length; i++) {
    s = run(s, { type: 'PEEK_CONFIRM' }, { type: 'PEEK_HIDE' });
  }
  return run(s, { type: 'START_VOTE', rng: seededRng(2) });
};

/** 按本轮 voteOrder 全员投票（v0.3.0：顺序随机，与名单顺序无关） */
const voteAll = (state: GameState, targetOf: (voterName: string) => string): GameState => {
  let s = state;
  for (const id of s.voteOrder) {
    const voter = playerById(s, id);
    const target = s.roster.find((p) => p.name === targetOf(voter.name))!;
    s = run(s, { type: 'VOTER_CONFIRM' }, { type: 'VOTE_CAST', targetId: target.id });
  }
  expect(s.phase.kind).toBe('voteResult');
  return s;
};

const roundEliminate = (state: GameState, target: string): GameState => {
  const fallback = state.roster.find((p) => p.name !== target && aliveIds(state).includes(p.id))!.name;
  return run(
    voteAll(state, (voter) => (voter === target ? fallback : target)),
    { type: 'PROCEED_FROM_RESULT' },
    { type: 'FLIP_IDENTITY' },
    { type: 'CONTINUE_AFTER_REVEAL', rng: seededRng(3) },
  );
};

/** 一轮「首投平票 → 全员直接重投仍平票 → 无人出局 → 下一轮」 */
const stuckRound = (state: GameState, tieMap: (voter: string) => string): GameState => {
  let s = run(voteAll(state, tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
  s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'TIE_STUCK_NEXT', rng: seededRng(4) });
  expect(s.phase.kind).toBe('vote');
  return s;
};

// ---------- 1. 重投轮候选排除自己 / 已出局者 ----------

describe('QA v0.2.0：重投轮候选仍排除自己与已出局者（PRD §3.2/§3.3）', () => {
  it('第 2 轮（D 已出局）平票 → 重投轮投出局者/自己均抛错；重投唯一最高正常出局并终局', () => {
    // 普通模式 4 人局，C 为卧底；第 1 轮投出平民 D
    let s = roundEliminate(beginGame(['A', 'B', 'C', 'D'], ['C'], 'normal'), 'D');
    expect(s.roundNo).toBe(2);
    expect(aliveIds(s)).toEqual(['p1', 'p2', 'p3']);

    // 第 2 轮三人循环互投（A→B、B→C、C→A）各 1 票平票
    const cycle = (voter: string) => (voter === 'A' ? 'B' : voter === 'B' ? 'C' : 'A');
    s = run(voteAll(s, cycle), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieAnnounce');
    expect(s.tiebreakIds).toEqual(['p1', 'p2', 'p3']); // 全员并列，全员存活（不含出局者 D）

    // 全员直接重投（可换票）：重投轮投票人仍为全部存活者，顺序沿用本轮
    s = run(s, { type: 'START_TIEBREAK' });
    expect(s.phase).toEqual({ kind: 'vote', index: 0, confirmed: false, tiebreak: true });
    const currentVoter = s.voteOrder[0]; // 当前投票人按本轮随机序（重投不重排）
    s = run(s, { type: 'VOTER_CONFIRM' });
    expect(() => run(s, { type: 'VOTE_CAST', targetId: 'p4' })).toThrow(); // 已出局者 D 不可投
    expect(() => run(s, { type: 'VOTE_CAST', targetId: currentVoter })).toThrow(); // 不可投自己（当前投票人）

    // 重投集中投卧底 C（C 本人投 A）→ 唯一最高出局 → 卧底全出局平民胜
    // （s 已 confirmed，voteAll 内 VOTER_CONFIRM 幂等，从当前投票人继续）
    s = run(voteAll(s, (voter) => (voter === 'A' || voter === 'B' ? 'C' : 'A')), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('reveal');
    expect(s.phase).toMatchObject({ eliminatedId: 'p3' });
    s = run(s, { type: 'FLIP_IDENTITY' }, { type: 'CONTINUE_AFTER_REVEAL', rng: seededRng(5) });
    expect(s.phase.kind).toBe('final');
    expect(s.winner).toBe('civilian');
    expect(s.eliminatedIds).toEqual(['p4', 'p3']);
  });
});

// ---------- 2. 「连续 3 轮」计数的连续语义 ----------

describe('QA v0.2.0：无人出局计数按「连续」累计，有人出局即归零（PRD §3.3 兜底）', () => {
  it('2 次无人出局后有人出局 → 计数归零；其后恰好第 3 次连续无人出局才触发兜底', () => {
    let s = beginGame(['A', 'B', 'C', 'D'], ['A']);
    const tieMap = (voter: string) => (voter === 'A' || voter === 'C' ? 'B' : 'C'); // B、C 各 2 票

    s = stuckRound(s, tieMap);
    expect(s.noExitStreak).toBe(1);
    expect(s.showFallback).toBe(false);
    s = stuckRound(s, tieMap);
    expect(s.noExitStreak).toBe(2);
    expect(s.showFallback).toBe(false);

    // 第 3 轮有人出局（平民 B）：连续被打断，计数归零，不触发兜底
    s = roundEliminate(s, 'B');
    expect(s.noExitStreak).toBe(0);
    expect(s.showFallback).toBe(false);
    expect(s.roundNo).toBe(4);
    expect(aliveIds(s)).toEqual(['p1', 'p3', 'p4']); // A、C、D 存活

    // 第 4-6 轮（存活 A/C/D）再次连续无人出局：前 2 次不触发，第 3 次恰好触发
    const cycle3 = (voter: string) => (voter === 'A' ? 'C' : voter === 'C' ? 'D' : 'A'); // 三人各 1 票
    s = stuckRound(s, cycle3);
    expect(s.noExitStreak).toBe(1);
    expect(s.showFallback).toBe(false);
    s = stuckRound(s, cycle3);
    expect(s.noExitStreak).toBe(2);
    expect(s.showFallback).toBe(false);
    s = run(
      voteAll(run(voteAll(s, cycle3), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' }), cycle3),
      { type: 'PROCEED_FROM_RESULT' },
    );
    expect(s.phase.kind).toBe('tieStuck');
    expect(s.noExitStreak).toBe(FALLBACK_ROUNDS);
    expect(s.showFallback).toBe(true);
  });
});

// ---------- 3. 普通模式无描述步（UI） ----------

describe('QA v0.2.0：普通模式看词完成 → 直接投票（无描述环节/无句式提示）', () => {
  it('切普通模式开局：全员看完词直接进投票交接，无「开始描述」与句式文案', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();

    // 切换普通模式（默认 4 人名单保留），开局
    await user.click(screen.getByRole('radio', { name: '🎭 普通' }));
    expect(screen.getByRole('radio', { name: '🎭 普通' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: '开始游戏' }));

    // 逐人看词（普通模式词随机，仅断言流程与提示归属；顺序为本局随机看词序）
    const rosterNames = ['爸爸', '妈妈', '哥哥', '妹妹'];
    const peeked: string[] = [];
    for (let i = 0; i < rosterNames.length; i++) {
      expect(await screen.findByText('下一个是')).toBeVisible();
      const name = document.querySelector('.handoff__name')?.textContent ?? '';
      expect(rosterNames).toContain(name);
      peeked.push(name);
      await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
      expect(await screen.findByText(`${name}，这是你的词`)).toBeVisible();
      await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
    }
    expect([...peeked].sort()).toEqual([...rosterNames].sort());

    // 看词完成页：普通模式文案，直接引导投票；无描述步按钮、无句式提示
    expect(await screen.findByText('词都记住啦！')).toBeVisible();
    expect(screen.getByText('大家先聊一聊，随时开始投票')).toBeVisible(); // COPY.peekDoneHint.normal
    expect(screen.queryByRole('button', { name: '开始描述 🎤' })).not.toBeInTheDocument();
    expect(screen.queryByText(/句式/)).not.toBeInTheDocument();
    expect(screen.queryByText(/它是一种/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));

    // 直达第一位投票人的交接卡（P4 → P6 直连）
    expect(await screen.findByText('下一个是')).toBeVisible();
    expect(screen.getByRole('button', { name: '是我，投票 🤫' })).toBeVisible();
  }, 30000);
});
