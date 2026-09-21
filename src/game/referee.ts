/** 裁定层：卧底数量映射、胜负判定（PRD §3.4）、战绩计分口径（PRD §3.5）。 */

import type { Camp, GameMode, Player, Role } from './types';

/**
 * 卧底数量（PRD §3.1）：普通模式 3-7 人 1 名、8-12 人 2 名；简单模式恒 1 名。
 * 所有局内界面不展示卧底数量（02-design §7-1），仅供发词与判定使用。
 */
export function undercoverCountFor(mode: GameMode, playerCount: number): number {
  if (playerCount < 3 || playerCount > 12) {
    throw new Error(`undercoverCountFor: 非法人数 ${playerCount}`);
  }
  if (mode === 'simple') {
    if (playerCount > 6) throw new Error(`undercoverCountFor: 简单模式最多 6 人，收到 ${playerCount}`);
    return 1;
  }
  return playerCount >= 8 ? 2 : 1;
}

/** 每轮投票结算后按序检查：卧底全出局 → 平民胜；存活卧底 ≥ 存活平民 → 卧底胜 */
export function judgeWinner(aliveRoles: readonly Role[]): Camp | null {
  const uc = aliveRoles.filter((r) => r === 'undercover').length;
  const civ = aliveRoles.length - uc;
  if (uc === 0) return 'civilian';
  if (uc >= civ) return 'undercover';
  return null;
}

export interface Profile {
  name: string;
  avatarId: string;
  games: number;
  wins: number;
}

/** 档案键：昵称 + 头像（PRD §3.5 / §9-6） */
export function profileKey(p: Player): string {
  return `${p.name}#${p.avatarId}`;
}

/**
 * 结算计分（纯函数）：全体参与者局数 +1；获胜阵营成员（含已出局者）各 +1 胜。
 */
export function applyGameResult(
  profiles: Record<string, Profile>,
  players: readonly Player[],
  roles: Record<string, Role>,
  winner: Camp,
): Record<string, Profile> {
  const next = { ...profiles };
  for (const p of players) {
    const key = profileKey(p);
    const base = next[key] ?? { name: p.name, avatarId: p.avatarId, games: 0, wins: 0 };
    next[key] = {
      ...base,
      games: base.games + 1,
      wins: base.wins + (roles[p.id] === winner ? 1 : 0),
    };
  }
  return next;
}
