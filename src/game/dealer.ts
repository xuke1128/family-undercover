/** 发词分配：选词对（避开近期用过的）+ 随机分配卧底。随机数全部注入。 */

import type { Assignment, GameMode, Player, Role } from './types';
import { pairsByDifficulty } from './wordBank';
import { pick, shuffle, type RNG } from './rng';
import { undercoverCountFor } from './referee';

/** 近期词对记忆上限：连局优先不与近几局重复（PRD §3.6） */
export const RECENT_PAIR_LIMIT = 10;

export interface DealOptions {
  mode: GameMode;
  recentPairIds: readonly string[];
  rng: RNG;
}

export function dealGame(roster: readonly Player[], opts: DealOptions): Assignment {
  if (roster.length === 0) throw new Error('dealGame: 名单为空');

  const difficulty = opts.mode === 'simple' ? 'easy' : 'normal';
  const fullPool = pairsByDifficulty(difficulty);
  const freshPool = fullPool.filter((p) => !opts.recentPairIds.includes(p.id));
  // 词池 50/60 对远大于记忆上限 10，理论不会耗尽；兜底保证流程不死
  const pair = pick(opts.rng, freshPool.length > 0 ? freshPool : fullPool);

  const undercoverCount = undercoverCountFor(opts.mode, roster.length);
  if (undercoverCount >= roster.length) throw new Error('dealGame: 卧底数不小于玩家数');

  const chosen = new Set(shuffle(opts.rng, roster.map((p) => p.id)).slice(0, undercoverCount));
  const roles: Record<string, Role> = {};
  for (const p of roster) roles[p.id] = chosen.has(p.id) ? 'undercover' : 'civilian';
  return { pair, roles };
}

/** 供连局记忆使用：把新用过的词对 id 推到队首，去重并截断 */
export function pushRecentPair(recent: readonly string[], pairId: string): string[] {
  return [pairId, ...recent.filter((id) => id !== pairId)].slice(0, RECENT_PAIR_LIMIT);
}
