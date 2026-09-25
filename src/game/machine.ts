/**
 * 游戏状态机（玩法规则核心，PRD §3.2-§3.7 全部规则落在此处）：
 * - 纯 reducer：无 IO；随机数（发词外的顺序洗牌）经 Action 注入 RNG，保证可复现可单测；
 * - 局内单向线性（DP3）：不存在任何「回到上一屏」的 Action；
 * - 无描述环节（2026-09-21 修订）：全员看词完成后直接进入投票；
 * - 平票：首投平票 → 全员直接重投一次（可换票）→ 仍平票则本轮无人出局；
 *   同一轮内最多重投一次；连续 3 轮无人出局触发 M2 兜底；
 * - 胜负：每次出局结算后按 §3.4 判定；
 * - 顺序随机（2026-09-22 修订 / PRD §9-15）：开局生成看词随机序 peekOrder；
 *   每一轮投票开始时重新洗牌生成 voteOrder（首轮 START_VOTE，后续轮
 *   CONTINUE_AFTER_REVEAL / TIE_STUCK_NEXT）；平票重投 START_TIEBREAK 沿用本轮顺序；
 *   出局者自动从后续轮次顺序中移除（新一轮只洗存活者）。
 */

import type { Assignment, Camp, GameMode, GameState, Player, Role, Vote } from './types';
import { tallyVotes } from './tally';
import { judgeWinner } from './referee';
import { shuffle, type RNG } from './rng';

export type Action =
  | { type: 'START_GAME'; roster: Player[]; mode: GameMode; assignment: Assignment; rng: RNG }
  | { type: 'PEEK_CONFIRM' }
  | { type: 'PEEK_HIDE' }
  | { type: 'START_VOTE'; rng: RNG }
  | { type: 'VOTER_CONFIRM' }
  | { type: 'VOTE_CAST'; targetId: string }
  | { type: 'PROCEED_FROM_RESULT' }
  | { type: 'START_TIEBREAK' }
  | { type: 'TIE_STUCK_NEXT'; rng: RNG }
  | { type: 'FLIP_IDENTITY' }
  | { type: 'CONTINUE_AFTER_REVEAL'; rng: RNG }
  | { type: 'FALLBACK_CONTINUE' }
  | { type: 'REDEAL'; assignment: Assignment; rng: RNG };

/** 连续无人出局达到该轮数时弹出兜底弹层（PRD §3.3 兜底） */
export const FALLBACK_ROUNDS = 3;

export function createInitialGame(roster: readonly Player[], mode: GameMode, assignment: Assignment, rng: RNG): GameState {
  if (roster.length < 3) throw new Error('createInitialGame: 至少 3 人');
  return {
    mode,
    roster: roster.map((p) => ({ ...p })),
    assignment,
    // 看词顺序每局随机生成一次，与名单添加顺序无关（PRD §9-15）
    peekOrder: shuffle(rng, roster.map((p) => p.id)),
    // 投票顺序到首轮投票开始（START_VOTE）时才生成
    voteOrder: [],
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

/** 某玩家的词（仅看词态 B 与终局结算渲染；出局揭晓不亮词（PRD §9-14），其余视图禁止引用） */
export function wordOf(state: GameState, playerId: string): string {
  return roleOf(state, playerId) === 'undercover' ? state.assignment.pair.undercover : state.assignment.pair.civilian;
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
    return action.type === 'START_GAME' ? createInitialGame(action.roster, action.mode, action.assignment, action.rng) : null;
  }
  switch (action.type) {
    case 'START_GAME': {
      return createInitialGame(action.roster, action.mode, action.assignment, action.rng);
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

    case 'START_VOTE': {
      // 看词完成 → 直接进入投票（2026-09-21 修订：删除描述环节）；
      // 每一轮投票顺序在该轮开始时重新洗牌（PRD §9-15），首轮亦然
      if (state.phase.kind !== 'peekDone') return state;
      return {
        ...state,
        voteOrder: shuffle(action.rng, aliveIds(state)),
        phase: { kind: 'vote', index: 0, confirmed: false, tiebreak: false },
      };
    }

    case 'VOTER_CONFIRM': {
      if (state.phase.kind !== 'vote' || state.phase.confirmed) return state;
      return { ...state, phase: { ...state.phase, confirmed: true } };
    }

    case 'VOTE_CAST': {
      if (state.phase.kind !== 'vote' || !state.phase.confirmed) return state;
      const alive = aliveIds(state);
      // 投票人按本轮随机序 voteOrder 轮转（与名单顺序无关）
      const voter = state.voteOrder[state.phase.index];
      if (!voter || !alive.includes(voter)) return state;
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
        // 首投平票 → 全员直接重投一次（P9 公告后进入重投轮，可换票）
        // votes 暂不清空：P9 需展示并列者票数，重投开始时再清
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
      // 全员直接重投（无补充环节）；候选仍为除自己外的存活玩家。
      // 平票重投沿用本轮 voteOrder 不重排；同一轮内无出局，存活集合不变（PRD §9-15）
      if (state.phase.kind !== 'tieAnnounce') return state;
      return { ...state, votes: [], tiebreakIds: [], phase: { kind: 'vote', index: 0, confirmed: false, tiebreak: true } };
    }

    case 'TIE_STUCK_NEXT': {
      // 重投仍平票 → 本轮无人出局；进入新一轮 → 重新洗牌投票顺序
      if (state.phase.kind !== 'tieStuck') return state;
      return {
        ...state,
        roundNo: state.roundNo + 1,
        voteOrder: shuffle(action.rng, aliveIds(state)),
        phase: { kind: 'vote', index: 0, confirmed: false, tiebreak: false },
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
      // 未分胜负 → 下一轮：出局者自动从顺序中移除（只洗存活者），顺序重新洗牌
      return {
        ...state,
        eliminatedIds,
        votes: [],
        tiebreakIds: [],
        noExitStreak: 0,
        roundNo: state.roundNo + 1,
        voteOrder: shuffle(action.rng, state.roster.filter((p) => !eliminatedIds.includes(p.id)).map((p) => p.id)),
        phase: { kind: 'vote', index: 0, confirmed: false, tiebreak: false },
      };
    }

    case 'FALLBACK_CONTINUE': {
      // M2「商量好了，下一轮」：仅关闭弹层，下一轮照常
      return { ...state, showFallback: false };
    }

    case 'REDEAL': {
      // 「再来一局」与「重开本局」共用：名单/模式不变，重新发词，roundNo 归 1；
      // 兜底重开与新局同样重新随机看词顺序
      return {
        ...createInitialGame(state.roster, state.mode, action.assignment, action.rng),
        gameSeq: state.gameSeq + 1,
      };
    }

    default: {
      // 穷尽性检查：新增 Action 忘记处理时编译期报错
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
