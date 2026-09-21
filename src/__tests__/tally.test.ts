import { describe, expect, it } from 'vitest';
import { tallyVotes } from '../game/tally';
import type { Vote } from '../game/types';

const v = (voterId: string, targetId: string): Vote => ({ voterId, targetId });

describe('tally 计票与平票（PRD §3.3）', () => {
  it('统计得票并找出唯一最高', () => {
    const votes = [v('a', 'b'), v('b', 'c'), v('c', 'b'), v('d', 'a')];
    const t = tallyVotes(votes, ['a', 'b', 'c', 'd']);
    expect(t.counts).toEqual({ a: 1, b: 2, c: 1, d: 0 });
    expect(t.maxCount).toBe(2);
    expect(t.topIds).toEqual(['b']);
    expect(t.isTie).toBe(false);
  });

  it('平票：topIds 含并列者', () => {
    const votes = [v('a', 'b'), v('b', 'c'), v('c', 'b'), v('d', 'c')];
    const t = tallyVotes(votes, ['a', 'b', 'c', 'd']);
    expect(t.maxCount).toBe(2);
    expect(t.topIds.sort()).toEqual(['b', 'c']);
    expect(t.isTie).toBe(true);
  });

  it('无票时 maxCount 为 0、无最高者', () => {
    const t = tallyVotes([], ['a', 'b']);
    expect(t.maxCount).toBe(0);
    expect(t.topIds).toEqual([]);
  });

  it('防御：目标不在存活列表的票不计入', () => {
    const t = tallyVotes([v('a', 'x')], ['a', 'b']);
    expect(t.counts.x).toBeUndefined();
    expect(t.maxCount).toBe(0);
  });
});
