import { describe, expect, it } from 'vitest';
import {
  aliveIds,
  createInitialGame,
  FALLBACK_ROUNDS,
  gameReducer,
  playerById,
  roleOf,
} from '../game/machine';
import type { Action } from '../game/machine';
import type { Assignment, GameMode, GameState, Player, Role } from '../game/types';
import { pairsByDifficulty } from '../game/wordBank';
import { sequenceRng, type RNG } from '../game/rng';

const players = (names: string[]): Player[] =>
  names.map((name, i) => ({ id: `p${i + 1}`, name, avatarId: `emoji:e${i}` }));

/** 确定性 PRNG（mulberry32）：固定种子 ⇒ 看词/投票顺序可复现（PRD §9-15） */
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

/** 指定卧底（按名字），构造确定性 Assignment */
const assignment = (roster: Player[], undercoverNames: string[], difficulty: 'easy' | 'normal' = 'easy'): Assignment => {
  const roles: Record<string, Role> = {};
  for (const p of roster) roles[p.id] = undercoverNames.includes(p.name) ? 'undercover' : 'civilian';
  return { pair: pairsByDifficulty(difficulty)[0], roles };
};

const start = (
  names: string[],
  undercoverNames: string[],
  mode: GameMode = 'simple',
  rng: RNG = seededRng(1),
): GameState => {
  const roster = players(names);
  return createInitialGame(roster, mode, assignment(roster, undercoverNames, mode === 'simple' ? 'easy' : 'normal'), rng);
};

const run = (state: GameState, ...actions: Action[]): GameState => {
  let s: GameState | null = state;
  for (const a of actions) {
    s = gameReducer(s, a);
    if (s === null) throw new Error('reducer 不应返回 null');
  }
  return s;
};

/** 全员看完词（peekDone）后直接开始投票（无描述环节，2026-09-21 修订） */
const beginGame = (
  names: string[],
  undercoverNames: string[],
  mode: GameMode = 'simple',
  peekRng: RNG = seededRng(1),
  voteRng: RNG = seededRng(2),
): GameState => {
  let s = start(names, undercoverNames, mode, peekRng);
  for (let i = 0; i < s.roster.length; i++) {
    s = run(s, { type: 'PEEK_CONFIRM' }, { type: 'PEEK_HIDE' });
  }
  expect(s.phase.kind).toBe('peekDone');
  return run(s, { type: 'START_VOTE', rng: voteRng });
};

/** 按本轮 voteOrder 全员投票（顺序随机后与名单顺序无关）：voterName -> targetName */
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

/** 一轮「全员投 target（target 本人投其他存活者）→ 揭晓 → 继续」 */
const roundEliminate = (state: GameState, target: string, rng: RNG = seededRng(3)): GameState => {
  const fallback = state.roster.find((p) => p.name !== target && aliveIds(state).includes(p.id))!.name;
  return run(
    voteAll(state, (voter) => (voter === target ? fallback : target)),
    { type: 'PROCEED_FROM_RESULT' },
    { type: 'FLIP_IDENTITY' },
    { type: 'CONTINUE_AFTER_REVEAL', rng },
  );
};

/** 排序后的 id 列表（比较两个顺序是否为同一集合的重排时使用） */
const sortedIds = (s: GameState): string[] => s.roster.map((p) => p.id).sort();

describe('machine 看词流程（US3/F2）', () => {
  it('三态推进：交接 → 看词 → 隐藏 → 下一位 → 完成 → 直接投票（无描述环节）', () => {
    let s = start(['A', 'B', 'C'], ['A']);
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: false });
    s = run(s, { type: 'PEEK_CONFIRM' });
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: true });
    s = run(s, { type: 'PEEK_CONFIRM' }); // 重复确认无效
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: true });
    s = run(s, { type: 'PEEK_HIDE' });
    expect(s.phase).toEqual({ kind: 'peek', index: 1, revealed: false });
    s = beginGame(['A', 'B', 'C'], ['A']);
    expect(s.phase).toEqual({ kind: 'vote', index: 0, confirmed: false, tiebreak: false });
  });

  it('未确认身份时无法隐藏（未看词者无法跳过确认）', () => {
    const s = start(['A', 'B', 'C'], ['A']);
    expect(run(s, { type: 'PEEK_HIDE' }).phase).toEqual({ kind: 'peek', index: 0, revealed: false });
  });
});

describe('machine 顺序随机（PRD §9-15，v0.3.0）', () => {
  const names4 = ['A', 'B', 'C', 'D'];

  it('开局生成看词随机序 peekOrder：与名单顺序无关的完整重排', () => {
    const s = start(names4, ['A']);
    expect([...s.peekOrder].sort()).toEqual(sortedIds(s));
    expect(s.voteOrder).toEqual([]); // 投票顺序到首轮投票开始才生成
  });

  it('注入固定种子时看词顺序与首轮投票顺序可复现', () => {
    const s1 = beginGame(names4, ['A'], 'simple', seededRng(7), seededRng(7));
    const s2 = beginGame(names4, ['A'], 'simple', seededRng(7), seededRng(7));
    expect(s1.peekOrder).toEqual(s2.peekOrder);
    expect(s1.voteOrder).toEqual(s2.voteOrder);
    for (const order of [s1.peekOrder, s1.voteOrder]) {
      expect([...order].sort()).toEqual(sortedIds(s1));
    }
  });

  it('voteOrder 与名单顺序可不同（每轮开始重新洗牌，非名单序）', () => {
    const rosterOrder = players(names4).map((p) => p.id);
    let hasDiff = false;
    // 不同种子驱动：至少存在一种顺序 ≠ 名单顺序（顺序确实被随机打乱）
    for (let seed = 1; seed <= 24 && !hasDiff; seed++) {
      const s = beginGame(names4, ['A'], 'simple', seededRng(seed), seededRng(seed + 100));
      if (s.voteOrder.join('>') !== rosterOrder.join('>')) hasDiff = true;
    }
    expect(hasDiff).toBe(true);
  });

  it('顺序均匀性冒烟：多种子产生多种不同排列，且均为全员重排', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const s = beginGame(names4, ['A'], 'simple', seededRng(seed), seededRng(seed + 100));
      seen.add(s.voteOrder.join('>'));
      expect([...s.voteOrder].sort()).toEqual(sortedIds(s));
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('平票重投沿用本轮 voteOrder（不重排）；进入新一轮才重新洗牌', () => {
    const tieMap = (voter: string) => (voter === 'A' || voter === 'C' ? 'B' : 'C'); // B、C 各 2 票
    let s = voteAll(beginGame(names4, ['A']), tieMap);
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieAnnounce');
    const roundOrder = s.voteOrder;
    s = run(s, { type: 'START_TIEBREAK' });
    expect(s.phase).toMatchObject({ kind: 'vote', tiebreak: true });
    expect(s.voteOrder).toEqual(roundOrder); // 重投不重排
    // 重投仍平票 → 无人出局 → 下一轮重排（仍为全员重排）
    s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    s = run(s, { type: 'TIE_STUCK_NEXT', rng: seededRng(23) });
    expect(s.roundNo).toBe(2);
    expect([...s.voteOrder].sort()).toEqual(sortedIds(s));
  });

  it('新一轮重新洗牌：两次轮次的投票顺序可不同；出局者不在后续顺序中', () => {
    // 用序列 RNG 精确控制洗牌结果：0.9 序列恰好洗回名单序，0 序列洗成轮换序
    const identity = sequenceRng([0.9, 0.9, 0.9]);
    let s = beginGame(names4, ['A'], 'simple', identity, sequenceRng([0.9, 0.9, 0.9]));
    expect(s.voteOrder).toEqual(['p1', 'p2', 'p3', 'p4']);

    // 平票路径保持 4 人不变 → 下一轮 TIE_STUCK_NEXT 重新洗牌，顺序可与上一轮不同
    const tieMap = (voter: string) => (voter === 'A' || voter === 'C' ? 'B' : 'C');
    s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    expect(s.voteOrder).toEqual(['p1', 'p2', 'p3', 'p4']); // 重投沿用本轮顺序
    s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    s = run(s, { type: 'TIE_STUCK_NEXT', rng: sequenceRng([0, 0, 0]) });
    expect(s.roundNo).toBe(2);
    expect(s.voteOrder).toEqual(['p2', 'p3', 'p4', 'p1']); // 新一轮重排，顺序可不同
    expect([...s.voteOrder].sort()).toEqual(sortedIds(s));

    // 出局路径：出局者自动从后续轮次顺序中移除（新一轮只洗存活者）
    const eliminatedRound = roundEliminate(beginGame(names4, ['A']), 'B');
    expect(eliminatedRound.roundNo).toBe(2);
    expect(eliminatedRound.voteOrder).not.toContain('p2');
    expect([...eliminatedRound.voteOrder].sort()).toEqual(['p1', 'p3', 'p4']);
  });

  it('8 人普通局 2 卧底：投票人严格按本轮 voteOrder 轮转（票的 voter 序列逐位等于 voteOrder），出局者退出后续轮转', () => {
    // 序列 RNG 全 0 ⇒ 洗牌结果为名单序左旋一位（确定性预言，且 ≠ 名单序）
    let s = beginGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], ['A', 'B'], 'normal', sequenceRng([0]), sequenceRng([0]));
    const roundOrder = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p1'];
    expect(s.voteOrder).toEqual(roundOrder); // 本轮随机序（非名单序 p1..p8）
    // 全员投卧底 B，B 本人投卧底 A：第 i 张票的投票人必须恰为 voteOrder[i]
    s = voteAll(s, (voter) => (voter === 'B' ? 'A' : 'B'));
    expect(s.votes.map((v) => v.voterId)).toEqual(roundOrder);
    expect(s.votes.map((v) => v.targetId)).toEqual(['p1', 'p2', 'p2', 'p2', 'p2', 'p2', 'p2', 'p2']);
    // B 以 7 票唯一最高出局；剩 1 卧底 vs 6 平民，未分胜负 → 第 2 轮重排（无 p2）
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase).toEqual({ kind: 'reveal', eliminatedId: 'p2', flipped: false });
    s = run(s, { type: 'FLIP_IDENTITY' }, { type: 'CONTINUE_AFTER_REVEAL', rng: sequenceRng([0]) });
    expect(s.roundNo).toBe(2);
    expect(s.votes).toEqual([]);
    expect(s.voteOrder).toEqual(['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p1']); // 存活 7 人左旋一位
  });
});

describe('machine 投票与出局（US5/US6）', () => {
  it('投自己抛错（不可投自己，缺陷即 E1 兜底）', () => {
    const s0 = beginGame(['A', 'B', 'C'], ['A']);
    const voterId = s0.voteOrder[0]; // 当前投票人按本轮随机序
    expect(() => run(s0, { type: 'VOTER_CONFIRM' }, { type: 'VOTE_CAST', targetId: voterId })).toThrow();
  });

  it('3 人简单局：卧底被投出局 → 平民胜', () => {
    let s = beginGame(['A', 'B', 'C'], ['A']);
    s = voteAll(s, (voter) => (voter === 'A' ? 'B' : 'A')); // A 得 2 票出局
    expect(s.votes).toHaveLength(3);
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase).toEqual({ kind: 'reveal', eliminatedId: s.roster[0].id, flipped: false });
    s = run(s, { type: 'FLIP_IDENTITY' });
    expect(roleOf(s, s.roster[0].id)).toBe('undercover');
    s = run(s, { type: 'CONTINUE_AFTER_REVEAL', rng: seededRng(9) });
    expect(s.phase.kind).toBe('final');
    expect(s.winner).toBe('civilian');
    expect(s.eliminatedIds).toEqual([s.roster[0].id]);
  });

  it('存活卧底追平平民 → 卧底胜（§3.4-2，无死锁）', () => {
    // 平民 B 出局后：A(卧底) vs C(平民) → 卧底胜
    const s = roundEliminate(beginGame(['A', 'B', 'C'], ['A']), 'B');
    expect(s.phase.kind).toBe('final');
    expect(s.winner).toBe('undercover');
  });

  it('未分胜负 → 下一轮直接全员投票，出局者不在投票人之列（第 N+1 轮）', () => {
    const s = roundEliminate(beginGame(['A', 'B', 'C', 'D'], ['A']), 'B');
    expect(s.phase).toEqual({ kind: 'vote', index: 0, confirmed: false, tiebreak: false });
    expect(s.roundNo).toBe(2);
    expect(aliveIds(s)).toEqual(['p1', 'p3', 'p4']);
    expect(s.voteOrder).not.toContain('p2');
  });

  it('8 人普通局：2 卧底逐个出局，最后一个卧底出局才平民胜', () => {
    let s = beginGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], ['A', 'B'], 'normal');
    expect(Object.values(s.assignment.roles).filter((r) => r === 'undercover')).toHaveLength(2);
    s = roundEliminate(s, 'A'); // 卧底 A 出局，仍剩 1 卧底
    expect(s.phase.kind).toBe('vote');
    s = roundEliminate(s, 'B'); // 卧底 B 出局 → 卧底全出局
    expect(s.phase.kind).toBe('final');
    expect(s.winner).toBe('civilian');
  });

  it('已出局者不在投票人、候选与后续 voteOrder 之列', () => {
    let s = roundEliminate(beginGame(['A', 'B', 'C', 'D'], ['A']), 'B');
    s = run(s, { type: 'VOTER_CONFIRM' });
    expect(aliveIds(s)).not.toContain('p2');
    expect(s.voteOrder).not.toContain('p2');
    expect(() => run(s, { type: 'VOTE_CAST', targetId: 'p2' })).toThrow();
  });
});

describe('machine 平票处理（PRD §3.3，US6）', () => {
  const begin4 = (): GameState => beginGame(['A', 'B', 'C', 'D'], ['A']);
  // A、C 投 B；B、D 投 C → B、C 各 2 票平票，且无人投自己
  const tieMap = (voter: string) => (voter === 'A' || voter === 'C' ? 'B' : 'C');

  it('首投平票 → 全员直接重投（无补充环节）→ 唯一最高出局', () => {
    let s = voteAll(begin4(), tieMap); // B、C 各 2 票
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieAnnounce');
    expect(s.tiebreakIds).toEqual(['p2', 'p3']);
    s = run(s, { type: 'START_TIEBREAK' });
    // 重投轮：全员（存活 4 人）从第一位开始，旧票已清，顺序沿用本轮
    expect(s.phase).toEqual({ kind: 'vote', index: 0, confirmed: false, tiebreak: true });
    expect(s.votes).toEqual([]);
    expect(s.tiebreakIds).toEqual([]);
    // 重投集中投 A（A 本人投 B）→ 唯一最高票
    s = voteAll(s, (voter) => (voter === 'A' ? 'B' : 'A'));
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('reveal');
    s = run(s, { type: 'FLIP_IDENTITY' }, { type: 'CONTINUE_AFTER_REVEAL', rng: seededRng(11) });
    expect(s.winner).toBe('civilian');
  });

  it('重投仍平票 → 本轮无人出局、直接进入下一轮全员投票', () => {
    let s = voteAll(begin4(), tieMap);
    s = run(s, { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = voteAll(s, tieMap); // 重投仍平票
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    expect(s.noExitStreak).toBe(1);
    expect(s.votes).toEqual([]);
    s = run(s, { type: 'TIE_STUCK_NEXT', rng: seededRng(12) });
    expect(s.phase).toEqual({ kind: 'vote', index: 0, confirmed: false, tiebreak: false });
    expect(s.roundNo).toBe(2);
    expect(aliveIds(s)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect([...s.voteOrder].sort()).toEqual(sortedIds(s));
  });

  it('同一轮内最多重投一次（重投后必然离开投票环节）', () => {
    let s = voteAll(begin4(), tieMap);
    s = run(s, { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    expect(run(s, { type: 'PROCEED_FROM_RESULT' }).phase.kind).toBe('tieStuck'); // 幂等，不会二次重投
  });

  it('连续 3 轮无人出局 → 触发兜底弹层；「商量好了」可继续', () => {
    let s = begin4();
    for (let round = 1; round <= FALLBACK_ROUNDS; round++) {
      s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
      s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' });
      expect(s.phase.kind).toBe('tieStuck');
      expect(s.showFallback).toBe(round >= FALLBACK_ROUNDS);
      s = run(s, { type: 'FALLBACK_CONTINUE' });
      expect(s.showFallback).toBe(false);
      if (round < FALLBACK_ROUNDS) s = run(s, { type: 'TIE_STUCK_NEXT', rng: seededRng(20 + round) });
    }
    expect(s.noExitStreak).toBe(FALLBACK_ROUNDS);
  });

  it('有人出局后无人出局计数归零', () => {
    let s = run(voteAll(begin4(), tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = run(voteAll(s, tieMap), { type: 'PROCEED_FROM_RESULT' }); // 无人出局 1 次
    expect(s.noExitStreak).toBe(1);
    // 出局一名平民（B）后游戏继续：计数应归零；此前已耗 2 轮（平票轮 + 无人出局轮），新一轮为第 3 轮
    s = roundEliminate(run(s, { type: 'TIE_STUCK_NEXT', rng: seededRng(31) }), 'B');
    expect(s.phase.kind).toBe('vote');
    expect(s.noExitStreak).toBe(0);
    expect(s.roundNo).toBe(3);
  });
});

describe('machine 连局与重开（US7，PRD §3.6）', () => {
  it('REDEAL：名单/模式沿用、roundNo 归 1、gameSeq+1、状态全新、看词顺序重排', () => {
    const s0 = start(['A', 'B', 'C'], ['A']);
    const mid = run(beginGame(['A', 'B', 'C'], ['A']), { type: 'VOTER_CONFIRM' });
    const next = run(mid, { type: 'REDEAL', assignment: assignment(mid.roster, ['B']), rng: seededRng(41) });
    expect(next.phase).toEqual({ kind: 'peek', index: 0, revealed: false });
    expect(next.roundNo).toBe(1);
    expect(next.gameSeq).toBe(s0.gameSeq + 1);
    expect(next.mode).toBe(s0.mode);
    expect(next.roster.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(roleOf(next, next.roster[1].id)).toBe('undercover');
    expect(next.noExitStreak).toBe(0);
    expect(next.eliminatedIds).toEqual([]);
    expect([...next.peekOrder].sort()).toEqual(sortedIds(next)); // 重开后看词顺序重新随机
    expect(next.voteOrder).toEqual([]);
  });

  it('相位不符的动作安全忽略（无任何回退动作，DP3）', () => {
    const s = start(['A', 'B', 'C'], ['A']);
    expect(run(s, { type: 'START_VOTE', rng: seededRng(1) })).toBe(s);
    expect(run(s, { type: 'VOTE_CAST', targetId: 'p2' })).toBe(s);
    expect(run(s, { type: 'CONTINUE_AFTER_REVEAL', rng: seededRng(1) })).toBe(s);
  });
});
