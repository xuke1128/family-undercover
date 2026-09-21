/**
 * 本机持久化（M7/US8）：战绩档案 + 近期词对记忆。
 * - 唯一 IO 出口：所有 localStorage 访问集中于此；
 * - 版本化（v:1）：未知/损坏数据整体丢弃重建，未来升级按 v 迁移；
 * - 档案键 = 昵称#头像Id（PRD §3.5/§9-6）；战绩只存本机、不跨设备。
 */

import type { Camp, Player, Role } from '../game/types';
import { applyGameResult, type Profile } from '../game/referee';
import { pushRecentPair } from '../game/dealer';

const STORAGE_KEY = 'family-undercover:store';
const STORE_VERSION = 1;

export interface AppStore {
  v: number;
  profiles: Record<string, Profile>;
  recentPairs: string[];
}

export const emptyStore = (): AppStore => ({ v: STORE_VERSION, profiles: {}, recentPairs: [] });

function isValidProfile(v: unknown): v is Profile {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    typeof p.avatarId === 'string' &&
    p.avatarId.length > 0 &&
    typeof p.games === 'number' &&
    Number.isInteger(p.games) &&
    p.games >= 0 &&
    typeof p.wins === 'number' &&
    Number.isInteger(p.wins) &&
    p.wins >= 0 &&
    p.wins <= p.games
  );
}

function parseStore(raw: string | null): AppStore {
  if (!raw) return emptyStore();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return emptyStore();
    const d = data as Record<string, unknown>;
    if (d.v !== STORE_VERSION) {
      // 版本不符：当前只有 v1，出现其他值视为损坏，重建
      return emptyStore();
    }
    const profiles: Record<string, Profile> = {};
    if (typeof d.profiles === 'object' && d.profiles !== null) {
      for (const [key, value] of Object.entries(d.profiles as Record<string, unknown>)) {
        if (isValidProfile(value)) profiles[key] = value;
      }
    }
    const recentPairs = Array.isArray(d.recentPairs)
      ? d.recentPairs.filter((x): x is string => typeof x === 'string').slice(0, 20)
      : [];
    return { v: STORE_VERSION, profiles, recentPairs };
  } catch {
    // JSON 损坏等：回退空档（不抛出，游戏主流程不依赖持久化）
    return emptyStore();
  }
}

/** 内存态读取环境（便于测试注入；默认真实 localStorage） */
export interface StorageEnv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultEnv = (): StorageEnv => {
  if (typeof window === 'undefined' || !window.localStorage) {
    // 极端环境（禁用存储）：内存易失实现，主流程仍可玩
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
    };
  }
  return window.localStorage;
};

export class AppStoreRepo {
  private env: StorageEnv;

  constructor(env?: StorageEnv) {
    this.env = env ?? defaultEnv();
  }

  load(): AppStore {
    return parseStore(this.env.getItem(STORAGE_KEY));
  }

  /** @returns 是否保存成功（失败时调用方 Toast 提示，不影响对局） */
  save(store: AppStore): boolean {
    try {
      this.env.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch {
      return false;
    }
  }

  /** 结算入档：获胜阵营（含已出局）+1 胜，全体 +1 局 */
  recordGameResult(
    store: AppStore,
    players: readonly Player[],
    roles: Record<string, Role>,
    winner: Camp,
  ): AppStore {
    return { ...store, profiles: applyGameResult(store.profiles, players, roles, winner) };
  }

  /** 连局避重：记录新用过的词对 */
  recordRecentPair(store: AppStore, pairId: string): AppStore {
    if (store.recentPairs[0] === pairId) return store;
    return { ...store, recentPairs: pushRecentPair(store.recentPairs, pairId) };
  }

  clear(): AppStore {
    return emptyStore();
  }
}

export interface LeaderboardRow {
  key: string;
  profile: Profile;
  winRate: number;
}

/** 排行榜排序：胜场降序 → 胜率降序 → 局数升序 → 昵称（稳定可复现） */
export function leaderboardRows(store: AppStore): LeaderboardRow[] {
  return Object.entries(store.profiles)
    .map(([key, profile]) => ({
      key,
      profile,
      winRate: profile.games > 0 ? profile.wins / profile.games : 0,
    }))
    .sort((a, b) => {
      if (b.profile.wins !== a.profile.wins) return b.profile.wins - a.profile.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (a.profile.games !== b.profile.games) return a.profile.games - b.profile.games;
      return a.profile.name.localeCompare(b.profile.name, 'zh-Hans-CN');
    });
}
