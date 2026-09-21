import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, pairsByDifficulty, WORD_PAIRS } from '../game/wordBank';
import type { Category } from '../game/types';

/**
 * QA 补充：词库数据校验（M2/M9/US10，技术方案 §6.1 口径 = 110 对）。
 * 现有 wordBank.test.ts 只验「≥100 / 每格 ≥10」，此处钉死交付口径与儿童适宜性数据检查
 * （内容适宜性以人工逐条 review 为主，此处用敏感要素黑名单做自动化兜底）。
 */

const CATEGORIES: Category[] = ['animal', 'food', 'object', 'character', 'place'];

/** 儿童不适宜要素黑名单：成人向/成瘾/暴力/敏感字样，命中即违规（多词素，避免「酒店」类误伤） */
const BLOCKLIST = [
  '色情',
  '暴力',
  '尸体',
  '坟',
  '赌',
  '毒',
  '裸',
  '枪',
  '血',
  '死',
  '香烟',
  '吸烟',
  '啤酒',
  '白酒',
  '红酒',
  '饮酒',
  '醉酒',
  '接吻',
] as const;

describe('QA 词库交付口径（技术方案 §6.1）', () => {
  it('总量恰为 110 对；简单池 50、普通池 60', () => {
    expect(WORD_PAIRS).toHaveLength(110);
    expect(pairsByDifficulty('easy')).toHaveLength(50);
    expect(pairsByDifficulty('normal')).toHaveLength(60);
  });

  it('分布恰为 5 分类 ×（简单 10 + 普通 12）', () => {
    expect(new Set(WORD_PAIRS.map((p) => p.category))).toEqual(new Set(CATEGORIES));
    for (const c of CATEGORIES) {
      const easy = WORD_PAIRS.filter((p) => p.category === c && p.difficulty === 'easy');
      const normal = WORD_PAIRS.filter((p) => p.category === c && p.difficulty === 'normal');
      expect(easy, `${c}/easy`).toHaveLength(10);
      expect(normal, `${c}/normal`).toHaveLength(12);
    }
  });

  it('id 符合 `<category>-<e|n><序号>` 规则且与自身分类/难度一致', () => {
    for (const p of WORD_PAIRS) {
      expect(p.id, `${p.id}`).toMatch(/^(animal|food|object|character|place)-(e([1-9]|10)|n([1-9]|1[0-2]))$/);
      const prefix = `${p.category}-${p.difficulty === 'easy' ? 'e' : 'n'}`;
      expect(p.id.startsWith(prefix), `${p.id} 应以 ${prefix} 开头`).toBe(true);
    }
  });

  it('儿童适宜兜底：无黑名单要素；两词均为 1-4 个纯中文字符', () => {
    for (const p of WORD_PAIRS) {
      for (const w of [p.civilian, p.undercover]) {
        expect(w, `${p.id}:${w}`).toMatch(/^[\u4e00-\u9fa5]{1,4}$/);
        for (const b of BLOCKLIST) {
          expect(w.includes(b), `词「${w}」（${p.id}）含违规要素「${b}」`).toBe(false);
        }
      }
    }
  });

  it('5 分类标签齐全（供逐条 review 与后续扩充）', () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...CATEGORIES].sort());
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABELS[c].length, `${c}`).toBeGreaterThan(0);
    }
  });
});
