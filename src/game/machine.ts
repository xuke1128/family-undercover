/**
 * 游戏状态机（玩法规则核心，PRD §3.2-§3.7 全部规则落在此处）：
 * - 纯 reducer：无 IO、无随机（发词由 App 层调用 dealer 生成 Assignment 后传入）；
 * - 局内单向线性（DP3）：不存在任何「回到上一屏」的 Action；
 * - 平票：首投平票 → 仅平票者描述 → 全员重投 → 仍平票则本轮无人出局；
 *   同一轮内最多重投一次；连续 3 轮无人出局触发 M2 兜底；
 * - 胜负：每次出局结算后按 §3.4 判定。
 */

import type { Assignment, Camp, GameMode, GameState, Player, Role, Vote } from './types';
import { tallyVotes } from './tally';
import { judgeWinner } from './referee';

export type Action =
  | { type: 'START_GAME'; roster: Player[]; mode: GameMode; assignment: Assignment }
  | { type: 'PEEK_CONFIRM' }
  | { type: 'PEEK_HIDE' }
  | { type: 'START_DESCRIBE' }
  | { type: 'DESCRIBE_NEXT' }
  | { type: 'VOTER_CONFIRM' }
  | { type: 'VOTE_CAST'; targetId: string }
  | { type: 'PROCEED_FROM_RESULT' }
  | { type: 'START_TIEBREAK' }
  | { type: 'TIE_STUCK_NEXT' }
  | { type: 'FLIP_IDENTITY' }
  | { type: 'CONTINUE_AFTER_REVEAL' }
  | { type: 'FALLBACK_CONTINUE' }
  | { type: 'REDEAL'; assignment: Assignment };

/** 连续无人出局达到该轮数时弹出兜底弹层（PRD §3.3 兜底） */
export const FALLBACK_ROUNDS = 3;

export function createInitialGame(roster: readonly Player[], mode: GameMode, assignment: Assignment): GameState {
  if (roster.length < 3) throw new Error('createInitialGame: 至少 3 人');
  return {
    mode,
    roster: roster.map((p) => ({ ...p })),
    assignment,
    phase: { kind: 'peek', index: 0, revealed: false },
    roundNo: 1,
    votes: [],
    eliminatedIds: [],
    tiebreakIds: [],
    noExitStreak: 0,
    showFallback: false,
    winner: null,
    gameSeq: 1,
  };
}

// ---------- 选择器（视图共用） ----------

export function aliveIds(state: GameState): string[] {
  const out = new Set(state.eliminatedIds);
  return state.roster.filter((p) => !out.has(p.id)).map((p) => p.id);
}

export function alivePlayers(state: GameState): Player[] {
  const out = new Set(state.eliminatedIds);
  return state.roster.filter((p) => !out.has(p.id));
}

export function roleOf(state: GameState, playerId: string): Role {
  const role = state.assignment.roles[playerId];
  if (!role) throw new Error(`roleOf: 未知玩家 ${playerId}`);
  return role;
}

/** 某玩家的词（仅看词态 B 与出局/终局揭晓渲染，其余视图禁止引用） */
export function wordOf(state: GameState, playerId: string): string {
  return roleOf(state, playerId) === 'undercover' ? state.assignment.pair.undercover : state.assignment.pair.civilian;
}

/** 描述轮次序：常规轮 = 存活者（座位序）；平票加赛 = 仅平票者（座位序） */
export function describeOrder(state: GameState): string[] {
  if (state.phase.kind !== 'describe') return [];
  return state.phase.tiebreak
    ? state.roster.filter((p) => state.tiebreakIds.includes(p.id)).map((p) => p.id)
    : aliveIds(state);
}

export function playerById(state: GameState, id: string): Player {
  const p = state.roster.find((x) => x.id === id);
  if (!p) throw new Error(`playerById: 未知玩家 ${id}`);
  return p;
}

export function currentTally(state: GameState) {
  return tallyVotes(state.votes, aliveIds(state));
}

// ---------- reducer ----------

export function gameReducer(state: GameState | null, action: Action): GameState | null {
  if (state === null) {
    // 游戏未开始：仅接受开局动作，其余（不可能发生）安全忽略
    return action.type === 'START_GAME' ? createInitialGame(action.roster, action.mode, action.assignment) : null;
  }
  switch (action.type) {
    case 'START_GAME': {
      return createInitialGame(action.roster, action.mode, action.assignment);
    }

    case 'PEEK_CONFIRM': {
      if (state.phase.kind !== 'peek' || state.phase.revealed) return state;
      return { ...state, phase: { ...state.phase, revealed: true } };
    }

    case 'PEEK_HIDE': {
      if (state.phase.kind !== 'peek' || !state.phase.revealed) return state;
      const next = state.phase.index + 1;
      if (next < state.roster.length) {
        return { ...state, phase: { kind: 'peek', index: next, revealed: false } };
      }
      return { ...state, phase: { kind: 'peekDone' } };
    }

    case 'START_DESCRIBE': {
      if (state.phase.kind !== 'peekDone') return state;
      return { ...state, phase: { kind: 'describe', index: 0, tiebreak: false } };
    }

    case 'DESCRIBE_NEXT': {
      if (state.phase.kind !== 'describe') return state;
      const order = describeOrder(state);
      const next = state.phase.index + 1;
      if (next < order.length) {
        return { ...state, phase: { ...state.phase, index: next } };
      }
      // 描述完成 → 投票（加赛轮的投票即「重新投票」）
      return { ...state, phase: { kind: 'vote', index: 0, confirmed: false, tiebreak: state.phase.tiebreak } };
    }

    case 'VOTER_CONFIRM': {
      if (state.phase.kind !== 'vote' || state.phase.confirmed) return state;
      return { ...state, phase: { ...state.phase, confirmed: true } };
    }

    case 'VOTE_CAST': {
      if (state.phase.kind !== 'vote' || !state.phase.confirmed) return state;
      const alive = aliveIds(state);
      const voter = alive[state.phase.index];
      if (!voter) return state;
      if (action.targetId === voter || !alive.includes(action.targetId)) {
        // 正常 UI 不可能触达；出现即视为缺陷，抛错走 E1 兜底
        throw new Error(`VOTE_CAST: 非法投票目标 ${action.targetId}`);
      }
      const votes: Vote[] = [...state.votes, { voterId: voter, targetId: action.targetId }];
      const next = state.phase.index + 1;
      if (next < alive.length) {
        return { ...state, votes, phase: { ...state.phase, index: next, confirmed: false } };
      }
      return { ...state, votes, phase: { kind: 'voteResult', tiebreak: state.phase.tiebreak } };
    }

    case 'PROCEED_FROM_RESULT': {
      if (state.phase.kind !== 'voteResult') return state;
      const tally = tallyVotes(state.votes, aliveIds(state));
      if (!tally.isTie) {
        // 唯一最高票 → 出局揭晓（P8）
        return {
          ...state,
          phase: { kind: 'reveal', eliminatedId: tally.topIds[0], flipped: false },
        };
      }
      if (!state.phase.tiebreak) {
        // 首投平票 → 平票者补描述后全员重投（P9 第一屏 → P5 加赛形态）
        // votes 暂不清空：P9 需展示并列者票数，加赛开始时再清
        const tiedInSeatOrder = aliveIds(state).filter((id) => tally.topIds.includes(id));
        return {
          ...state,
          tiebreakIds: tiedInSeatOrder,
          phase: { kind: 'tieAnnounce' },
        };
      }
      // 重投仍平票 → 本轮无人出局，进入下一轮（PRD §3.3）
      const streak = state.noExitStreak + 1;
      return {
        ...state,
        votes: [],
        tiebreakIds: [],
        noExitStreak: streak,
        showFallback: streak >= FALLBACK_ROUNDS,
        phase: { kind: 'tieStuck' },
      };
    }

    case 'START_TIEBREAK': {
      if (state.phase.kind !== 'tieAnnounce') return state;
      return { ...state, votes: [], phase: { kind: 'describe', index: 0, tiebreak: true } };
    }

    case 'TIE_STUCK_NEXT': {
      if (state.phase.kind !== 'tieStuck') return state;
      return {
        ...state,
        roundNo: state.roundNo + 1,
        phase: { kind: 'describe', index: 0, tiebreak: false },
      };
    }

    case 'FLIP_IDENTITY': {
      if (state.phase.kind !== 'reveal' || state.phase.flipped) return state;
      return { ...state, phase: { ...state.phase, flipped: true } };
    }

    case 'CONTINUE_AFTER_REVEAL': {
      if (state.phase.kind !== 'reveal' || !state.phase.flipped) return state;
      const eliminatedIds = [...state.eliminatedIds, state.phase.eliminatedId];
      const aliveRoles: Role[] = state.roster
        .filter((p) => !eliminatedIds.includes(p.id))
        .map((p) => state.assignment.roles[p.id]);
      const winner: Camp | null = judgeWinner(aliveRoles);
      if (winner) {
        return { ...state, eliminatedIds, votes: [], winner, phase: { kind: 'final' } };
      }
      return {
        ...state,
        eliminatedIds,
        votes: [],
        tiebreakIds: [],
        noExitStreak: 0,
        roundNo: state.roundNo + 1,
        phase: { kind: 'describe', index: 0, tiebreak: false },
      };
    }

    case 'FALLBACK_CONTINUE': {
      // M2「商量好了，下一轮」：仅关闭弹层，下一轮照常
      return { ...state, showFallback: false };
    }

    case 'REDEAL': {
      // 「再来一局」与「重开本局」共用：名单/模式不变，重新发词，roundNo 归 1
      return { ...createInitialGame(state.roster, state.mode, action.assignment), gameSeq: state.gameSeq + 1 };
    }

    default: {
      // 穷尽性检查：新增 Action 忘记处理时编译期报错
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
