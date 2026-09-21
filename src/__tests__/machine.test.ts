import { describe, expect, it } from 'vitest';
import {
  aliveIds,
  createInitialGame,
  describeOrder,
  FALLBACK_ROUNDS,
  gameReducer,
  playerById,
  roleOf,
} from '../game/machine';
import type { Action } from '../game/machine';
import type { Assignment, GameMode, GameState, Player, Role } from '../game/types';
import { pairsByDifficulty } from '../game/wordBank';

const players = (names: string[]): Player[] =>
  names.map((name, i) => ({ id: `p${i + 1}`, name, avatarId: `emoji:e${i}` }));

/** 指定卧底（按名字），构造确定性 Assignment */
const assignment = (roster: Player[], undercoverNames: string[], difficulty: 'easy' | 'normal' = 'easy'): Assignment => {
  const roles: Record<string, Role> = {};
  for (const p of roster) roles[p.id] = undercoverNames.includes(p.name) ? 'undercover' : 'civilian';
  return { pair: pairsByDifficulty(difficulty)[0], roles };
};

const start = (names: string[], undercoverNames: string[], mode: GameMode = 'simple'): GameState => {
  const roster = players(names);
  return createInitialGame(roster, mode, assignment(roster, undercoverNames, mode === 'simple' ? 'easy' : 'normal'));
};

const run = (state: GameState, ...actions: Action[]): GameState => {
  let s: GameState | null = state;
  for (const a of actions) {
    s = gameReducer(s, a);
    if (s === null) throw new Error('reducer 不应返回 null');
  }
  return s;
};

/** 全员看完词并进入描述轮 */
const beginGame = (names: string[], undercoverNames: string[], mode: GameMode = 'simple'): GameState => {
  let s = start(names, undercoverNames, mode);
  for (let i = 0; i < s.roster.length; i++) {
    s = run(s, { type: 'PEEK_CONFIRM' }, { type: 'PEEK_HIDE' });
  }
  expect(s.phase.kind).toBe('peekDone');
  return run(s, { type: 'START_DESCRIBE' });
};

/** 当前描述轮全员完成，进入投票态 */
const describeAll = (state: GameState): GameState => {
  expect(state.phase.kind).toBe('describe');
  let s = state;
  const order = describeOrder(s);
  for (let i = 0; i < order.length; i++) s = run(s, { type: 'DESCRIBE_NEXT' });
  expect(s.phase.kind).toBe('vote');
  return s;
};

/** 全员投票：voterName -> targetName */
const voteAll = (state: GameState, targetOf: (voterName: string) => string): GameState => {
  let s = state;
  for (const id of [...aliveIds(s)]) {
    const voter = playerById(s, id);
    const target = s.roster.find((p) => p.name === targetOf(voter.name))!;
    s = run(s, { type: 'VOTER_CONFIRM' }, { type: 'VOTE_CAST', targetId: target.id });
  }
  expect(s.phase.kind).toBe('voteResult');
  return s;
};

/** 一轮「描述 → 全员投 target（target 本人投其他存活者）→ 揭晓 → 继续」 */
const roundEliminate = (state: GameState, target: string): GameState => {
  const fallback = state.roster.find((p) => p.name !== target && aliveIds(state).includes(p.id))!.name;
  return run(
    voteAll(describeAll(state), (voter) => (voter === target ? fallback : target)),
    { type: 'PROCEED_FROM_RESULT' },
    { type: 'FLIP_IDENTITY' },
    { type: 'CONTINUE_AFTER_REVEAL' },
  );
};

describe('machine 看词流程（US3/F2）', () => {
  it('三态推进：交接 → 看词 → 隐藏 → 下一位 → 完成 → 描述', () => {
    let s = start(['A', 'B', 'C'], ['A']);
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: false });
    s = run(s, { type: 'PEEK_CONFIRM' });
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: true });
    s = run(s, { type: 'PEEK_CONFIRM' }); // 重复确认无效
    expect(s.phase).toEqual({ kind: 'peek', index: 0, revealed: true });
    s = run(s, { type: 'PEEK_HIDE' });
    expect(s.phase).toEqual({ kind: 'peek', index: 1, revealed: false });
    s = beginGame(['A', 'B', 'C'], ['A']);
    expect(s.phase).toEqual({ kind: 'describe', index: 0, tiebreak: false });
  });

  it('未确认身份时无法隐藏（未看词者无法跳过确认）', () => {
    const s = start(['A', 'B', 'C'], ['A']);
    expect(run(s, { type: 'PEEK_HIDE' }).phase).toEqual({ kind: 'peek', index: 0, revealed: false });
  });
});

describe('machine 投票与出局（US6/US7）', () => {
  it('投自己抛错（不可投自己，缺陷即 E1 兜底）', () => {
    const s0 = describeAll(beginGame(['A', 'B', 'C'], ['A']));
    expect(() => run(s0, { type: 'VOTER_CONFIRM' }, { type: 'VOTE_CAST', targetId: s0.roster[0].id })).toThrow();
  });

  it('3 人简单局：卧底被投出局 → 平民胜', () => {
    let s = beginGame(['A', 'B', 'C'], ['A']);
    s = voteAll(describeAll(s), (voter) => (voter === 'A' ? 'B' : 'A')); // A 得 2 票出局
    expect(s.votes).toHaveLength(3);
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase).toEqual({ kind: 'reveal', eliminatedId: s.roster[0].id, flipped: false });
    s = run(s, { type: 'FLIP_IDENTITY' });
    expect(roleOf(s, s.roster[0].id)).toBe('undercover');
    s = run(s, { type: 'CONTINUE_AFTER_REVEAL' });
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

  it('未分胜负 → 下一轮全员描述，出局者不在轮次中（第 N+1 轮）', () => {
    const s = roundEliminate(beginGame(['A', 'B', 'C', 'D'], ['A']), 'B');
    expect(s.phase.kind).toBe('describe');
    expect(s.roundNo).toBe(2);
    expect(aliveIds(s)).toEqual(['p1', 'p3', 'p4']);
    expect(describeOrder(s)).toEqual(['p1', 'p3', 'p4']);
  });

  it('8 人普通局：2 卧底逐个出局，最后一个卧底出局才平民胜', () => {
    let s = beginGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], ['A', 'B'], 'normal');
    expect(Object.values(s.assignment.roles).filter((r) => r === 'undercover')).toHaveLength(2);
    s = roundEliminate(s, 'A'); // 卧底 A 出局，仍剩 1 卧底
    expect(s.phase.kind).toBe('describe');
    s = roundEliminate(s, 'B'); // 卧底 B 出局 → 卧底全出局
    expect(s.phase.kind).toBe('final');
    expect(s.winner).toBe('civilian');
  });

  it('已出局者不在投票人与候选之列', () => {
    let s = roundEliminate(beginGame(['A', 'B', 'C', 'D'], ['A']), 'B');
    s = describeAll(s);
    expect(aliveIds(s)).not.toContain('p2');
    expect(() => run(s, { type: 'VOTER_CONFIRM' }, { type: 'VOTE_CAST', targetId: 'p2' })).toThrow();
  });
});

describe('machine 平票处理（PRD §3.3，US7）', () => {
  const begin4 = (): GameState => beginGame(['A', 'B', 'C', 'D'], ['A']);
  // A、C 投 B；B、D 投 C → B、C 各 2 票平票，且无人投自己
  const tieMap = (voter: string) => (voter === 'A' || voter === 'C' ? 'B' : 'C');

  it('首投平票 → 仅平票者加赛描述 → 全员重投 → 唯一最高出局', () => {
    let s = voteAll(describeAll(begin4()), tieMap); // B、C 各 2 票
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieAnnounce');
    expect(s.tiebreakIds).toEqual(['p2', 'p3']);
    s = run(s, { type: 'START_TIEBREAK' });
    expect(s.phase).toEqual({ kind: 'describe', index: 0, tiebreak: true });
    expect(describeOrder(s)).toEqual(['p2', 'p3']);
    s = describeAll(s);
    expect(s.phase).toMatchObject({ kind: 'vote', tiebreak: true });
    expect(s.votes).toEqual([]); // 旧票已清，重投重新计
    // 重投集中投 A（A 本人投 B）→ 唯一最高票
    s = voteAll(s, (voter) => (voter === 'A' ? 'B' : 'A'));
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('reveal');
    s = run(s, { type: 'FLIP_IDENTITY' }, { type: 'CONTINUE_AFTER_REVEAL' });
    expect(s.winner).toBe('civilian');
  });

  it('重投仍平票 → 本轮无人出局、进入下一轮全员描述', () => {
    let s = voteAll(describeAll(begin4()), tieMap);
    s = run(s, { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = voteAll(describeAll(s), tieMap); // 重投仍平票
    s = run(s, { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    expect(s.noExitStreak).toBe(1);
    expect(s.votes).toEqual([]);
    s = run(s, { type: 'TIE_STUCK_NEXT' });
    expect(s.phase).toEqual({ kind: 'describe', index: 0, tiebreak: false });
    expect(s.roundNo).toBe(2);
    expect(describeOrder(s)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('同一轮内最多重投一次（重投后必然离开投票环节）', () => {
    let s = voteAll(describeAll(begin4()), tieMap);
    s = run(s, { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = run(voteAll(describeAll(s), tieMap), { type: 'PROCEED_FROM_RESULT' });
    expect(s.phase.kind).toBe('tieStuck');
    expect(run(s, { type: 'PROCEED_FROM_RESULT' }).phase.kind).toBe('tieStuck'); // 幂等，不会二次重投
  });

  it('连续 3 轮无人出局 → 触发兜底弹层；「商量好了」可继续', () => {
    let s = begin4();
    for (let round = 1; round <= FALLBACK_ROUNDS; round++) {
      s = run(voteAll(describeAll(s), tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
      s = run(voteAll(describeAll(s), tieMap), { type: 'PROCEED_FROM_RESULT' });
      expect(s.phase.kind).toBe('tieStuck');
      expect(s.showFallback).toBe(round >= FALLBACK_ROUNDS);
      s = run(s, { type: 'FALLBACK_CONTINUE' });
      expect(s.showFallback).toBe(false);
      if (round < FALLBACK_ROUNDS) s = run(s, { type: 'TIE_STUCK_NEXT' });
    }
    expect(s.noExitStreak).toBe(FALLBACK_ROUNDS);
  });

  it('有人出局后无人出局计数归零', () => {
    let s = run(voteAll(describeAll(begin4()), tieMap), { type: 'PROCEED_FROM_RESULT' }, { type: 'START_TIEBREAK' });
    s = run(voteAll(describeAll(s), tieMap), { type: 'PROCEED_FROM_RESULT' }); // 无人出局 1 次
    expect(s.noExitStreak).toBe(1);
    // 出局一名平民（B）后游戏继续：计数应归零；此前已耗 2 轮（平票轮 + 无人出局轮），新一轮为第 3 轮
    s = roundEliminate(run(s, { type: 'TIE_STUCK_NEXT' }), 'B');
    expect(s.phase.kind).toBe('describe');
    expect(s.noExitStreak).toBe(0);
    expect(s.roundNo).toBe(3);
  });
});

describe('machine 连局与重开（US8，PRD §3.6）', () => {
  it('REDEAL：名单/模式沿用、roundNo 归 1、gameSeq+1、状态全新', () => {
    const s0 = start(['A', 'B', 'C'], ['A']);
    const mid = run(describeAll(beginGame(['A', 'B', 'C'], ['A'])), { type: 'DESCRIBE_NEXT' });
    const next = run(mid, { type: 'REDEAL', assignment: assignment(mid.roster, ['B']) });
    expect(next.phase).toEqual({ kind: 'peek', index: 0, revealed: false });
    expect(next.roundNo).toBe(1);
    expect(next.gameSeq).toBe(s0.gameSeq + 1);
    expect(next.mode).toBe(s0.mode);
    expect(next.roster.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(roleOf(next, next.roster[1].id)).toBe('undercover');
    expect(next.noExitStreak).toBe(0);
    expect(next.eliminatedIds).toEqual([]);
  });

  it('相位不符的动作安全忽略（无任何回退动作，DP3）', () => {
    const s = start(['A', 'B', 'C'], ['A']);
    expect(run(s, { type: 'START_DESCRIBE' })).toBe(s);
    expect(run(s, { type: 'VOTE_CAST', targetId: 'p2' })).toBe(s);
    expect(run(s, { type: 'CONTINUE_AFTER_REVEAL' })).toBe(s);
  });
});
