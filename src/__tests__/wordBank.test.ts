import { describe, expect, it } from 'vitest';
import { WORD_PAIRS } from '../game/wordBank';
import type { Category } from '../game/types';

/** US10 / M2 / M9：词库规模、结构与内容约束 */
describe('wordBank 词库', () => {
  it('总量 ≥100 对', () => {
    expect(WORD_PAIRS.length).toBeGreaterThanOrEqual(100);
  });

  it('5 分类 × 2 难度每格 ≥10 对', () => {
    const categories: Category[] = ['animal', 'food', 'object', 'character', 'place'];
    for (const category of categories) {
      for (const difficulty of ['easy', 'normal'] as const) {
        const n = WORD_PAIRS.filter((p) => p.category === category && p.difficulty === difficulty).length;
        expect(n, `${category}/${difficulty}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('id 唯一', () => {
    const ids = new Set(WORD_PAIRS.map((p) => p.id));
    expect(ids.size).toBe(WORD_PAIRS.length);
  });

  it('每对两词不同且非空，长度 1-4 字', () => {
    for (const p of WORD_PAIRS) {
      expect(p.civilian.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.civilian.length, p.id).toBeLessThanOrEqual(4);
      expect(p.undercover.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.undercover.length, p.id).toBeLessThanOrEqual(4);
      expect(p.civilian, p.id).not.toEqual(p.undercover);
    }
  });

  it('每个词语在全库只出现一次（避免同词跨对造成提示混乱）', () => {
    const seen = new Set<string>();
    for (const p of WORD_PAIRS) {
      for (const w of [p.civilian, p.undercover]) {
        expect(seen.has(w), `重复词语：${w}`).toBe(false);
        seen.add(w);
      }
    }
  });
});
