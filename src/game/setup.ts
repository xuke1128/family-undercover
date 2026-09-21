/** 局前名单与模式规则（PRD §3.1/§3.7，US2/US9 的全部边界行为）。 */

import type { GameMode, Player } from './types';
import { shuffle, type RNG } from './rng';
import { ALL_AVATAR_IDS } from '../avatars/catalog';

export const MIN_PLAYERS = 3;
export const SIMPLE_MAX_PLAYERS = 6;
export const NORMAL_MAX_PLAYERS = 12;
export const NAME_MAX_CHARS = 8;

export function capFor(mode: GameMode): number {
  return mode === 'simple' ? SIMPLE_MAX_PLAYERS : NORMAL_MAX_PLAYERS;
}

export type AddCheck = { ok: true } | { ok: false; reason: 'simple-full' | 'normal-full' };

/** 尝试加人是否允许：简单 6 人 / 普通 12 人封顶（越界由 UI 提示并给出对应行动） */
export function checkAddPlayer(mode: GameMode, playerCount: number): AddCheck {
  if (playerCount >= capFor(mode)) {
    return mode === 'simple' ? { ok: false, reason: 'simple-full' } : { ok: false, reason: 'normal-full' };
  }
  return { ok: true };
}

/** 模式切换是否允许：普通 >6 人时不可切回简单（需先删减，PRD §3.7） */
export function canSwitchMode(target: GameMode, playerCount: number): boolean {
  if (target === 'simple') return playerCount <= SIMPLE_MAX_PLAYERS;
  return true;
}

export type RosterIssue =
  | { code: 'too-few'; missing: number }
  | { code: 'too-many' }
  | { code: 'name-empty'; index: number }
  | { code: 'name-dup'; index: number; name: string }
  | { code: 'name-long'; index: number }
  | { code: 'avatar-dup'; index: number };

/** 开局前校验：人数在区间内、昵称非空且不重复（≤8 字）、头像不重复 */
export function validateRoster(mode: GameMode, players: readonly Player[]): { ok: boolean; issue?: RosterIssue } {
  if (players.length < MIN_PLAYERS) {
    return { ok: false, issue: { code: 'too-few', missing: MIN_PLAYERS - players.length } };
  }
  if (players.length > capFor(mode)) {
    return { ok: false, issue: { code: 'too-many' } };
  }
  const names = new Set<string>();
  const avatars = new Set<string>();
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const name = p.name.trim();
    if (name.length === 0) return { ok: false, issue: { code: 'name-empty', index: i } };
    if (name.length > NAME_MAX_CHARS) return { ok: false, issue: { code: 'name-long', index: i } };
    if (names.has(name)) return { ok: false, issue: { code: 'name-dup', index: i, name } };
    if (avatars.has(p.avatarId)) return { ok: false, issue: { code: 'avatar-dup', index: i } };
    names.add(name);
    avatars.add(p.avatarId);
  }
  return { ok: true };
}

let playerSeq = 0;
export function nextPlayerId(): string {
  playerSeq += 1;
  return `p${playerSeq}`;
}

/** 默认预填名单（US1/US2）：爸爸/妈妈/哥哥/妹妹 + 4 个原创头像 */
export function defaultRoster(): Player[] {
  return [
    { id: nextPlayerId(), name: '爸爸', avatarId: 'custom:nuandad' },
    { id: nextPlayerId(), name: '妈妈', avatarId: 'custom:tianma' },
    { id: nextPlayerId(), name: '哥哥', avatarId: 'custom:pixelkid' },
    { id: nextPlayerId(), name: '妹妹', avatarId: 'custom:pinkbunny' },
  ];
}

/** 从未占用头像中随机一个（含未占用的原创头像） */
export function randomUnoccupiedAvatarId(rng: RNG, occupied: readonly string[]): string {
  const occupiedSet = new Set(occupied);
  const free = ALL_AVATAR_IDS.filter((id) => !occupiedSet.has(id));
  if (free.length === 0) throw new Error('randomUnoccupiedAvatarId: 头像库耗尽');
  return free[Math.floor(rng() * free.length)];
}

/** 一键全员随机头像：互不重复 */
export function randomizeAllAvatars(rng: RNG, players: readonly Player[]): Player[] {
  const ids = shuffle(rng, ALL_AVATAR_IDS).slice(0, players.length);
  return players.map((p, i) => ({ ...p, avatarId: ids[i] }));
}
