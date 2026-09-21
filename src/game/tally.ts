/** 计票与平票判定（PRD §3.3 前半）：纯函数，供状态机与 P7 公示页共用。 */

import type { Vote } from './types';

export interface TallyResult {
  /** 存活玩家得票数（含 0 票者） */
  counts: Record<string, number>;
  maxCount: number;
  /** 得票最高的玩家（唯一时长度为 1，平票时 >1） */
  topIds: string[];
  isTie: boolean;
}

export function tallyVotes(votes: readonly Vote[], aliveIds: readonly string[]): TallyResult {
  const counts: Record<string, number> = {};
  const aliveSet = new Set(aliveIds);
  for (const id of aliveIds) counts[id] = 0;
  for (const v of votes) {
    // 防御：非法票（非存活目标）不计数。正常流程由状态机校验，不会出现
    if (!aliveSet.has(v.targetId)) continue;
    counts[v.targetId] = (counts[v.targetId] ?? 0) + 1;
  }
  let maxCount = 0;
  for (const id of aliveIds) maxCount = Math.max(maxCount, counts[id] ?? 0);
  const topIds = maxCount > 0 ? aliveIds.filter((id) => counts[id] === maxCount) : [];
  return { counts, maxCount, topIds, isTie: topIds.length > 1 };
}
