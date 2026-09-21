import { describe, expect, it } from 'vitest';
import { AppStoreRepo, emptyStore, leaderboardRows, type StorageEnv } from '../storage/appStore';
import type { Camp, Player, Role } from '../game/types';

function memoryEnv(initial?: Record<string, string>): StorageEnv & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

const players: Player[] = [
  { id: '1', name: '小美', avatarId: 'emoji:🐵' },
  { id: '2', name: '爸爸', avatarId: 'custom:nuandad' },
  { id: '3', name: '妹妹', avatarId: 'custom:pinkbunny' },
];

describe('storage 版本化读写（M7/US8）', () => {
  it('空环境读取 → 空档；保存后可读回', () => {
    const env = memoryEnv();
    const repo = new AppStoreRepo(env);
    expect(repo.load()).toEqual(emptyStore());

    const scored = repo.recordGameResult(repo.load(), players, { '1': 'undercover', '2': 'civilian', '3': 'civilian' }, 'undercover');
    expect(repo.save(scored)).toBe(true);
    const loaded = repo.load();
    expect(Object.keys(loaded.profiles)).toHaveLength(3);
    expect(loaded.profiles['小美#emoji:🐵']).toMatchObject({ games: 1, wins: 1 });
    expect(loaded.profiles['爸爸#custom:nuandad']).toMatchObject({ games: 1, wins: 0 });
  });

  it('损坏 JSON / 版本不符 / 非法档案 → 回退空档或剔除', () => {
    expect(new AppStoreRepo(memoryEnv({ 'family-undercover:store': 'not json' })).load()).toEqual(emptyStore());
    expect(
      new AppStoreRepo(
        memoryEnv({ 'family-undercover:store': JSON.stringify({ v: 99, profiles: {}, recentPairs: [] }) }),
      ).load(),
    ).toEqual(emptyStore());

    const bad = {
      v: 1,
      profiles: {
        ok: { name: '小美', avatarId: 'a', games: 2, wins: 1 },
        bad1: { name: '', avatarId: 'a', games: 1, wins: 0 },
        bad2: { name: 'X', avatarId: 'a', games: 1, wins: 5 }, // wins > games
        bad3: { name: 'Y', avatarId: 'a', games: 1.5, wins: 0 }, // 非整数
      },
      recentPairs: ['a', 42, null, 'b'],
    };
    const loaded = new AppStoreRepo(memoryEnv({ 'family-undercover:store': JSON.stringify(bad) })).load();
    expect(Object.keys(loaded.profiles)).toEqual(['ok']);
    expect(loaded.recentPairs).toEqual(['a', 'b']);
  });

  it('写入失败（配额/禁用）返回 false，不抛出', () => {
    const env: StorageEnv = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(new AppStoreRepo(env).save(emptyStore())).toBe(false);
  });

  it('结算计分：获胜阵营含已出局成员记胜；清空回空档', () => {
    const repo = new AppStoreRepo(memoryEnv());
    let store = repo.load();
    const roles: Record<string, Role> = { '1': 'civilian', '2': 'civilian', '3': 'undercover' };
    const winner: Camp = 'civilian';
    store = repo.recordGameResult(store, players, roles, winner);
    store = repo.recordGameResult(store, players, roles, winner);
    expect(store.profiles['小美#emoji:🐵']).toEqual({ name: '小美', avatarId: 'emoji:🐵', games: 2, wins: 2 });
    expect(store.profiles['妹妹#custom:pinkbunny']).toMatchObject({ games: 2, wins: 0 });
    const cleared = repo.clear();
    expect(cleared).toEqual(emptyStore());
  });

  it('近期词对：去重置顶并截断（连局避重）', () => {
    const repo = new AppStoreRepo(memoryEnv());
    let store = repo.load();
    for (const id of ['a', 'b', 'c', 'a', 'd']) store = repo.recordRecentPair(store, id);
    expect(store.recentPairs).toEqual(['d', 'a', 'c', 'b']);
  });

  it('排行榜排序：胜场降序 → 胜率降序 → 局数升序 → 昵称', () => {
    const store = emptyStore();
    Object.assign(store.profiles, {
      a: { name: '阿大', avatarId: 'x', games: 10, wins: 5 }, // 50%
      b: { name: '小美', avatarId: 'x', games: 6, wins: 5 }, // 83%，胜场同、胜率高
      c: { name: '爸爸', avatarId: 'x', games: 20, wins: 8 }, // 胜场最高
      d: { name: '爷爷', avatarId: 'x', games: 4, wins: 3 }, // 75% 但胜场 3
    });
    const names = leaderboardRows(store).map((r) => r.profile.name);
    expect(names).toEqual(['爸爸', '小美', '阿大', '爷爷']);
  });
});
