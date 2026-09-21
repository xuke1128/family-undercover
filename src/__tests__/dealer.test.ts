import { describe, expect, it } from 'vitest';
import { dealGame, pushRecentPair, RECENT_PAIR_LIMIT } from '../game/dealer';
import { mathRandom } from '../game/rng';
import type { GameMode, Player } from '../game/types';

const roster = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `玩家${i + 1}`, avatarId: `emoji:😀${i}` }));

describe('dealer 发词分配（US4）', () => {
  it('简单模式：仅简单词库、恰 1 名卧底（3-6 人）', () => {
    for (const n of [3, 4, 5, 6]) {
      const a = dealGame(roster(n), { mode: 'simple', recentPairIds: [], rng: mathRandom });
      expect(a.pair.difficulty, `${n} 人`).toBe('easy');
      const uc = Object.values(a.roles).filter((r) => r === 'undercover').length;
      expect(uc, `${n} 人`).toBe(1);
    }
  });

  it('普通模式：3-7 人 1 名卧底、8-12 人 2 名卧底', () => {
    for (const n of [3, 7]) {
      const a = dealGame(roster(n), { mode: 'normal', recentPairIds: [], rng: mathRandom });
      expect(Object.values(a.roles).filter((r) => r === 'undercover').length, `${n} 人`).toBe(1);
      expect(a.pair.difficulty).toBe('normal');
    }
    for (const n of [8, 12]) {
      const a = dealGame(roster(n), { mode: 'normal', recentPairIds: [], rng: mathRandom });
      expect(Object.values(a.roles).filter((r) => r === 'undercover').length, `${n} 人`).toBe(2);
    }
  });

  it('平民同词、卧底拿同对相近词（阵营发词正确）', () => {
    for (let i = 0; i < 10; i++) {
      const a = dealGame(roster(6), { mode: 'simple', recentPairIds: [], rng: mathRandom });
      const civilians = roster(6).filter((p) => a.roles[p.id] === 'civilian');
      const undercovers = roster(6).filter((p) => a.roles[p.id] === 'undercover');
      const civWords = new Set(civilians.map(() => a.pair.civilian));
      expect(civWords.size).toBe(1);
      expect(undercovers.every(() => a.pair.civilian !== a.pair.undercover)).toBe(true);
    }
  });

  it('避开近期用过的词对；记忆去重并截断', () => {
    const a = dealGame(roster(4), { mode: 'simple', recentPairIds: [], rng: mathRandom });
    let recent: string[] = [a.pair.id];
    for (let i = 0; i < 10; i++) {
      const next = dealGame(roster(4), { mode: 'simple', recentPairIds: recent, rng: mathRandom });
      expect(recent).not.toContain(next.pair.id);
      recent = pushRecentPair(recent, next.pair.id);
    }
    expect(recent.length).toBeLessThanOrEqual(RECENT_PAIR_LIMIT);
    expect(new Set(recent).size).toBe(recent.length);
  });

  it('连玩 20 局：词对与卧底人选有随机性分布（US4）', () => {
    const modes: GameMode[] = ['simple', 'normal'];
    for (const mode of modes) {
      const pairs = new Set<string>();
      const ucIndex = new Set<string>();
      const n = mode === 'simple' ? 6 : 8;
      const players = roster(n);
      for (let i = 0; i < 20; i++) {
        const a = dealGame(players, { mode, recentPairIds: [], rng: mathRandom });
        pairs.add(a.pair.id);
        const uc = players.find((p) => a.roles[p.id] === 'undercover')!;
        ucIndex.add(uc.id);
      }
      expect(pairs.size, `${mode} 模式词对应有多样性`).toBeGreaterThan(2);
      expect(ucIndex.size, `${mode} 模式卧底人选应有多样性`).toBeGreaterThan(2);
    }
  });

  it('注入序列 RNG 时结果可复现', () => {
    const opts = (seed: number) => ({
      mode: 'normal' as GameMode,
      recentPairIds: [] as string[],
      rng: () => seed,
    });
    const a1 = dealGame(roster(5), opts(0.42));
    const a2 = dealGame(roster(5), opts(0.42));
    expect(a1).toEqual(a2);
  });
});
