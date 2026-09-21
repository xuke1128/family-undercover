import { describe, expect, it } from 'vitest';
import {
  capFor,
  canSwitchMode,
  checkAddPlayer,
  defaultRoster,
  NAME_MAX_CHARS,
  randomizeAllAvatars,
  randomUnoccupiedAvatarId,
  validateRoster,
} from '../game/setup';
import { mathRandom } from '../game/rng';
import { ALL_AVATAR_IDS } from '../avatars/catalog';
import type { Player } from '../game/types';

const p = (id: string, name: string, avatarId?: string): Player => ({ id, name, avatarId: avatarId ?? `emoji:x${id}` });

describe('setup 人数边界与模式切换（US2/US9，PRD §3.7）', () => {
  it('模式人数上限：简单 6 / 普通 12', () => {
    expect(capFor('simple')).toBe(6);
    expect(capFor('normal')).toBe(12);
  });

  it('添加检查：简单 6 人满、普通 12 人满', () => {
    expect(checkAddPlayer('simple', 5)).toEqual({ ok: true });
    expect(checkAddPlayer('simple', 6)).toEqual({ ok: false, reason: 'simple-full' });
    expect(checkAddPlayer('normal', 11)).toEqual({ ok: true });
    expect(checkAddPlayer('normal', 12)).toEqual({ ok: false, reason: 'normal-full' });
  });

  it('切回简单模式：>6 人被阻止，≤6 人允许；切普通恒允许', () => {
    expect(canSwitchMode('simple', 7)).toBe(false);
    expect(canSwitchMode('simple', 6)).toBe(true);
    expect(canSwitchMode('normal', 12)).toBe(true);
  });

  it('名单校验：人数/昵称/头像全维度', () => {
    const valid: Player[] = [p('1', '爸爸'), p('2', '妈妈'), p('3', '哥哥')];
    expect(validateRoster('simple', valid).ok).toBe(true);

    expect(validateRoster('simple', valid.slice(0, 2)).issue?.code).toBe('too-few');
    expect(validateRoster('simple', [p('1', ''), p('2', '妈妈'), p('3', '哥哥')]).issue?.code).toBe('name-empty');
    expect(validateRoster('simple', [p('1', '爸爸'), p('2', '爸爸'), p('3', '哥哥')]).issue?.code).toBe('name-dup');
    expect(
      validateRoster('simple', [p('1', '这个名字有十个字啦'), p('2', '妈妈'), p('3', '哥哥')]).issue?.code,
    ).toBe('name-long');
    expect(
      validateRoster('simple', [p('1', '爸爸', 'emoji:🐶'), p('2', '妈妈', 'emoji:🐶'), p('3', '哥哥')]).issue?.code,
    ).toBe('avatar-dup');
  });

  it('昵称上限为 8 字（设计约束）', () => {
    expect(NAME_MAX_CHARS).toBe(8);
  });
});

describe('setup 默认名单与头像（US1/US2）', () => {
  it('默认预填爸爸/妈妈/哥哥/妹妹 + 4 个原创头像，互不重复', () => {
    const roster = defaultRoster();
    expect(roster.map((x) => x.name)).toEqual(['爸爸', '妈妈', '哥哥', '妹妹']);
    expect(roster.map((x) => x.avatarId)).toEqual([
      'custom:nuandad',
      'custom:tianma',
      'custom:pixelkid',
      'custom:pinkbunny',
    ]);
    expect(new Set(roster.map((x) => x.id)).size).toBe(4);
  });

  it('随机头像：排除已占用；全员随机互不重复', () => {
    const roster = defaultRoster();
    const occupied = roster.map((x) => x.avatarId);
    for (let i = 0; i < 10; i++) {
      const id = randomUnoccupiedAvatarId(mathRandom, occupied);
      expect(occupied).not.toContain(id);
      expect(ALL_AVATAR_IDS).toContain(id);
    }
    const randomized = randomizeAllAvatars(mathRandom, [...roster, p('5', '爷爷'), p('6', '奶奶')]);
    expect(new Set(randomized.map((x) => x.avatarId)).size).toBe(randomized.length);
    // 切换模式不影响昵称与 id（只动头像）
    expect(randomized.map((x) => x.name)).toEqual([...roster, p('5', '爷爷'), p('6', '奶奶')].map((x) => x.name));
  });
});

describe('头像库（M1：≥52 个）', () => {
  it('总数 = 4 原创 + 50 emoji = 54，id 唯一', () => {
    expect(ALL_AVATAR_IDS.length).toBe(54);
    expect(new Set(ALL_AVATAR_IDS).size).toBe(54);
  });

  it('emoji 5 分组各 10 个', async () => {
    const { EMOJI_AVATARS, EMOJI_GROUPS } = await import('../avatars/catalog');
    for (const g of EMOJI_GROUPS) {
      expect(EMOJI_AVATARS.filter((a) => a.group === g).length, g).toBe(10);
    }
  });
});
