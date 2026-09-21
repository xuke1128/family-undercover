import { describe, expect, it } from 'vitest';
import { applyGameResult, judgeWinner, profileKey, undercoverCountFor } from '../game/referee';
import type { Player, Role } from '../game/types';

describe('undercoverCountFor 卧底数量映射（PRD §3.1）', () => {
  it('简单模式恒 1 名（3-6 人）', () => {
    for (const n of [3, 4, 5, 6]) expect(undercoverCountFor('simple', n)).toBe(1);
  });

  it('简单模式 7 人抛错（人数边界）', () => {
    expect(() => undercoverCountFor('simple', 7)).toThrow();
  });

  it('普通模式 3-7 人 1 名、8-12 人 2 名', () => {
    expect(undercoverCountFor('normal', 3)).toBe(1);
    expect(undercoverCountFor('normal', 7)).toBe(1);
    expect(undercoverCountFor('normal', 8)).toBe(2);
    expect(undercoverCountFor('normal', 12)).toBe(2);
  });

  it('非法人数抛错', () => {
    expect(() => undercoverCountFor('normal', 2)).toThrow();
    expect(() => undercoverCountFor('normal', 13)).toThrow();
  });
});

describe('judgeWinner 胜负判定（PRD §3.4）', () => {
  it('卧底全出局 → 平民胜', () => {
    expect(judgeWinner(['civilian', 'civilian', 'civilian'])).toBe('civilian');
  });

  it('存活卧底数 ≥ 存活平民数 → 卧底胜（含 1v1 死锁保护）', () => {
    expect(judgeWinner(['undercover', 'civilian'])).toBe('undercover');
    expect(judgeWinner(['undercover', 'undercover', 'civilian', 'civilian'])).toBe('undercover');
    expect(judgeWinner(['undercover', 'civilian', 'civilian'])).toBeNull();
  });

  it('未分胜负返回 null', () => {
    expect(judgeWinner(['undercover', 'civilian', 'civilian', 'civilian'])).toBeNull();
  });
});

describe('applyGameResult 计分口径（PRD §3.5）', () => {
  const players: Player[] = [
    { id: '1', name: '小美', avatarId: 'emoji:🐵' },
    { id: '2', name: '爸爸', avatarId: 'emoji:🐼' },
    { id: '3', name: '妹妹', avatarId: 'emoji:🦊' },
  ];
  // 小美(卧底)、爸爸/妹妹(平民)；卧底胜
  const roles: Record<string, Role> = { '1': 'undercover', '2': 'civilian', '3': 'civilian' };

  it('全体 +1 局；获胜阵营（含已出局者由调用方保证传入）各 +1 胜', () => {
    const next = applyGameResult({}, players, roles, 'undercover');
    expect(next[profileKey(players[0])]).toEqual({ name: '小美', avatarId: 'emoji:🐵', games: 1, wins: 1 });
    expect(next[profileKey(players[1])]).toEqual({ name: '爸爸', avatarId: 'emoji:🐼', games: 1, wins: 0 });
    expect(next[profileKey(players[2])]).toEqual({ name: '妹妹', avatarId: 'emoji:🦊', games: 1, wins: 0 });
  });

  it('跨局累计', () => {
    const once = applyGameResult({}, players, roles, 'undercover');
    const twice = applyGameResult(once, players, roles, 'civilian');
    expect(twice[profileKey(players[0])].games).toBe(2);
    expect(twice[profileKey(players[0])].wins).toBe(1);
    expect(twice[profileKey(players[1])].wins).toBe(1);
  });
});
