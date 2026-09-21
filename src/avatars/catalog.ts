/**
 * 头像库（M1/US2）：共 54 个 = 4 个原创 SVG 定制头像 + 50 个 emoji 头像（5 组 × 10）。
 * 版权口径（PRD §9-11）：4 个定制头像为原创绘制（暖爸/甜妈/像素小子/粉兜兔），
 * 不使用任何真实人物/版权角色形象与商标名；emoji 为系统字体字符。
 */

export type EmojiGroup = 'animal' | 'food' | 'face' | 'thing' | 'fantasy';

export interface CustomAvatarDef {
  id: string;
  kind: 'custom';
  /** 展示名（原创头像带名称与「✨ 原创」标记） */
  name: string;
  /** 固定浅色圆底，形成专属感 */
  bg: string;
}

export interface EmojiAvatarDef {
  id: string;
  kind: 'emoji';
  face: string;
  bg: string;
  group: EmojiGroup;
}

export type AvatarDef = CustomAvatarDef | EmojiAvatarDef;

/** 底色循环（与 mockup 同系的浅色） */
const BGS = ['#E9F9F3', '#FFEDE6', '#FFF6DF', '#F0EAFE', '#E3F0FD', '#FFE3EF', '#F1ECE4'] as const;

function bg(i: number): string {
  return BGS[i % BGS.length];
}

export const CUSTOM_AVATARS: readonly CustomAvatarDef[] = [
  { id: 'custom:nuandad', kind: 'custom', name: '暖爸', bg: '#E8EFF7' },
  { id: 'custom:tianma', kind: 'custom', name: '甜妈', bg: '#FFE9E0' },
  { id: 'custom:pinkbunny', kind: 'custom', name: '粉兜兔', bg: '#FFE3EF' },
  { id: 'custom:pixelkid', kind: 'custom', name: '像素小子', bg: '#E3F0FD' },
];

const EMOJI_BY_GROUP: Record<EmojiGroup, readonly string[]> = {
  animal: ['🐵', '🐼', '🦊', '🐸', '🐷', '🐯', '🐨', '🦁', '🐰', '🐻'],
  food: ['🍓', '🍉', '🍇', '🍑', '🥕', '🌽', '🍞', '🧁', '🍭', '🍩'],
  face: ['😄', '😆', '😊', '🥰', '😎', '🤩', '😴', '🤔', '😲', '🥳'],
  thing: ['⚽', '🎈', '🪁', '🎁', '🎨', '🎲', '📚', '🎧', '🚗', '✈️'],
  fantasy: ['🦄', '🐲', '🧚', '🧙', '🧜', '🦸', '🤖', '🛸', '🌈', '⭐'],
};

export const EMOJI_GROUP_LABELS: Record<EmojiGroup, string> = {
  animal: '动物',
  food: '食物',
  face: '表情',
  thing: '物品',
  fantasy: '幻想',
};

export const EMOJI_GROUPS: readonly EmojiGroup[] = ['animal', 'food', 'face', 'thing', 'fantasy'];

export const EMOJI_AVATARS: readonly EmojiAvatarDef[] = EMOJI_GROUPS.flatMap((group, gi) =>
  EMOJI_BY_GROUP[group].map((face, i) => ({
    id: `emoji:${face}`,
    kind: 'emoji' as const,
    face,
    bg: bg(gi * 10 + i),
    group,
  })),
);

export const ALL_AVATARS: readonly AvatarDef[] = [...CUSTOM_AVATARS, ...EMOJI_AVATARS];

export const ALL_AVATAR_IDS: readonly string[] = ALL_AVATARS.map((a) => a.id);

const BY_ID = new Map(ALL_AVATARS.map((a) => [a.id, a]));

export function getAvatar(id: string): AvatarDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`getAvatar: 未知头像 ${id}`);
  return def;
}

export function emojiAvatarsOfGroup(group: EmojiGroup): readonly EmojiAvatarDef[] {
  return EMOJI_AVATARS.filter((a) => a.group === group);
}
