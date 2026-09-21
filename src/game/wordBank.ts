/**
 * 内置词库（M2/M9）：110 对相近词 = 5 分类 ×（简单 10 对 + 普通 12 对）。
 *
 * 合规与口径（US10）：
 * - 全部词对人工逐条整理，儿童适宜（无成人向 / 恐怖 / 敏感 / 商标词）；
 * - 「动画角色（character）」分类以原创角色原型呈现（公主、巫师、忍者等），
 *   不使用任何版权角色形象与商标名（PRD §9-11 版权红线）；
 * - 约束由 wordBank.test.ts 自动校验：id 唯一、civilian ≠ undercover、
 *   每个词语在全库只出现一次、词语长度 1-4 字。
 */

import type { Category, Difficulty, WordPair } from './types';

interface PairSeed {
  /** 分类内序号（如 e1..e10 / n1..n12），id = `${category}-${序号}` */
  no: string;
  civilian: string;
  undercover: string;
}

const SEEDS: Record<Category, Record<Difficulty, PairSeed[]>> = {
  animal: {
    easy: [
      { no: 'e1', civilian: '猫', undercover: '狗' },
      { no: 'e2', civilian: '兔子', undercover: '仓鼠' },
      { no: 'e3', civilian: '大象', undercover: '犀牛' },
      { no: 'e4', civilian: '长颈鹿', undercover: '斑马' },
      { no: 'e5', civilian: '企鹅', undercover: '海豹' },
      { no: 'e6', civilian: '金鱼', undercover: '乌龟' },
      { no: 'e7', civilian: '蝴蝶', undercover: '蜻蜓' },
      { no: 'e8', civilian: '母鸡', undercover: '鸭子' },
      { no: 'e9', civilian: '熊猫', undercover: '黑熊' },
      { no: 'e10', civilian: '小羊', undercover: '小猪' },
    ],
    normal: [
      { no: 'n1', civilian: '狮子', undercover: '老虎' },
      { no: 'n2', civilian: '鲸鱼', undercover: '鲨鱼' },
      { no: 'n3', civilian: '鳄鱼', undercover: '蜥蜴' },
      { no: 'n4', civilian: '袋鼠', undercover: '考拉' },
      { no: 'n5', civilian: '刺猬', undercover: '豪猪' },
      { no: 'n6', civilian: '蝙蝠', undercover: '猫头鹰' },
      { no: 'n7', civilian: '章鱼', undercover: '水母' },
      { no: 'n8', civilian: '螃蟹', undercover: '龙虾' },
      { no: 'n9', civilian: '天鹅', undercover: '白鹭' },
      { no: 'n10', civilian: '骆驼', undercover: '羊驼' },
      { no: 'n11', civilian: '松鼠', undercover: '河狸' },
      { no: 'n12', civilian: '海豚', undercover: '海狮' },
    ],
  },
  food: {
    easy: [
      { no: 'e1', civilian: '苹果', undercover: '梨' },
      { no: 'e2', civilian: '香蕉', undercover: '玉米' },
      { no: 'e3', civilian: '包子', undercover: '饺子' },
      { no: 'e4', civilian: '面条', undercover: '米线' },
      { no: 'e5', civilian: '鸡蛋', undercover: '鸭蛋' },
      { no: 'e6', civilian: '牛奶', undercover: '豆浆' },
      { no: 'e7', civilian: '西瓜', undercover: '南瓜' },
      { no: 'e8', civilian: '草莓', undercover: '樱桃' },
      { no: 'e9', civilian: '饼干', undercover: '蛋糕' },
      { no: 'e10', civilian: '糖果', undercover: '巧克力' },
    ],
    normal: [
      { no: 'n1', civilian: '汉堡', undercover: '肉夹馍' },
      { no: 'n2', civilian: '披萨', undercover: '馅饼' },
      { no: 'n3', civilian: '火锅', undercover: '麻辣烫' },
      { no: 'n4', civilian: '寿司', undercover: '饭团' },
      { no: 'n5', civilian: '粽子', undercover: '青团' },
      { no: 'n6', civilian: '汤圆', undercover: '麻团' },
      { no: 'n7', civilian: '薯条', undercover: '薯片' },
      { no: 'n8', civilian: '月饼', undercover: '酥饼' },
      { no: 'n9', civilian: '豆腐', undercover: '奶酪' },
      { no: 'n10', civilian: '冰淇淋', undercover: '冰沙' },
      { no: 'n11', civilian: '春卷', undercover: '煎饼' },
      { no: 'n12', civilian: '果冻', undercover: '布丁' },
    ],
  },
  object: {
    easy: [
      { no: 'e1', civilian: '筷子', undercover: '勺子' },
      { no: 'e2', civilian: '碗', undercover: '杯子' },
      { no: 'e3', civilian: '铅笔', undercover: '蜡笔' },
      { no: 'e4', civilian: '帽子', undercover: '围巾' },
      { no: 'e5', civilian: '鞋子', undercover: '袜子' },
      { no: 'e6', civilian: '椅子', undercover: '凳子' },
      { no: 'e7', civilian: '雨伞', undercover: '扇子' },
      { no: 'e8', civilian: '牙刷', undercover: '梳子' },
      { no: 'e9', civilian: '书包', undercover: '行李箱' },
      { no: 'e10', civilian: '台灯', undercover: '蜡烛' },
    ],
    normal: [
      { no: 'n1', civilian: '手表', undercover: '手环' },
      { no: 'n2', civilian: '镜子', undercover: '放大镜' },
      { no: 'n3', civilian: '剪刀', undercover: '钳子' },
      { no: 'n4', civilian: '肥皂', undercover: '沐浴露' },
      { no: 'n5', civilian: '闹钟', undercover: '沙漏' },
      { no: 'n6', civilian: '梯子', undercover: '滑梯' },
      { no: 'n7', civilian: '钥匙', undercover: '锁' },
      { no: 'n8', civilian: '橡皮', undercover: '尺子' },
      { no: 'n9', civilian: '雨靴', undercover: '拖鞋' },
      { no: 'n10', civilian: '指南针', undercover: '望远镜' },
      { no: 'n11', civilian: '纽扣', undercover: '拉链' },
      { no: 'n12', civilian: '手套', undercover: '口罩' },
    ],
  },
  character: {
    easy: [
      { no: 'e1', civilian: '公主', undercover: '王子' },
      { no: 'e2', civilian: '机器人', undercover: '木偶' },
      { no: 'e3', civilian: '小仙女', undercover: '小精灵' },
      { no: 'e4', civilian: '海盗', undercover: '船长' },
      { no: 'e5', civilian: '圣诞老人', undercover: '雪人' },
      { no: 'e6', civilian: '国王', undercover: '女王' },
      { no: 'e7', civilian: '美人鱼', undercover: '潜水员' },
      { no: 'e8', civilian: '小丑', undercover: '魔术师' },
      { no: 'e9', civilian: '忍者', undercover: '武士' },
      { no: 'e10', civilian: '独角兽', undercover: '小飞马' },
    ],
    normal: [
      { no: 'n1', civilian: '侦探', undercover: '警察' },
      { no: 'n2', civilian: '消防员', undercover: '救护员' },
      { no: 'n3', civilian: '医生', undercover: '护士' },
      { no: 'n4', civilian: '农夫', undercover: '园丁' },
      { no: 'n5', civilian: '渔夫', undercover: '猎人' },
      { no: 'n6', civilian: '面包师', undercover: '厨师' },
      { no: 'n7', civilian: '邮递员', undercover: '快递员' },
      { no: 'n8', civilian: '科学家', undercover: '发明家' },
      { no: 'n9', civilian: '画家', undercover: '摄影师' },
      { no: 'n10', civilian: '歌手', undercover: '舞蹈家' },
      { no: 'n11', civilian: '骑士', undercover: '卫兵' },
      { no: 'n12', civilian: '宇航员', undercover: '飞行员' },
    ],
  },
  place: {
    easy: [
      { no: 'e1', civilian: '学校', undercover: '幼儿园' },
      { no: 'e2', civilian: '公园', undercover: '游乐场' },
      { no: 'e3', civilian: '超市', undercover: '菜市场' },
      { no: 'e4', civilian: '动物园', undercover: '水族馆' },
      { no: 'e5', civilian: '医院', undercover: '诊所' },
      { no: 'e6', civilian: '海边', undercover: '游泳池' },
      { no: 'e7', civilian: '图书馆', undercover: '书店' },
      { no: 'e8', civilian: '车站', undercover: '机场' },
      { no: 'e9', civilian: '厨房', undercover: '餐厅' },
      { no: 'e10', civilian: '卧室', undercover: '客厅' },
    ],
    normal: [
      { no: 'n1', civilian: '博物馆', undercover: '美术馆' },
      { no: 'n2', civilian: '体育馆', undercover: '健身房' },
      { no: 'n3', civilian: '电影院', undercover: '剧院' },
      { no: 'n4', civilian: '理发店', undercover: '美容院' },
      { no: 'n5', civilian: '银行', undercover: '邮局' },
      { no: 'n6', civilian: '面包店', undercover: '咖啡店' },
      { no: 'n7', civilian: '酒店', undercover: '民宿' },
      { no: 'n8', civilian: '天台', undercover: '阳台' },
      { no: 'n9', civilian: '桥', undercover: '隧道' },
      { no: 'n10', civilian: '农场', undercover: '牧场' },
      { no: 'n11', civilian: '码头', undercover: '灯塔' },
      { no: 'n12', civilian: '庙会', undercover: '夜市' },
    ],
  },
};

export const WORD_PAIRS: readonly WordPair[] = Object.entries(SEEDS).flatMap(([category, byDifficulty]) =>
  Object.entries(byDifficulty).flatMap(([difficulty, seeds]) =>
    seeds.map((s) => ({
      id: `${category}-${s.no}`,
      category: category as Category,
      difficulty: difficulty as Difficulty,
      civilian: s.civilian,
      undercover: s.undercover,
    })),
  ),
);

export function pairsByDifficulty(difficulty: Difficulty): readonly WordPair[] {
  return WORD_PAIRS.filter((p) => p.difficulty === difficulty);
}

export const CATEGORY_LABELS: Record<Category, string> = {
  animal: '动物',
  food: '食物',
  object: '日常物品',
  character: '动画角色',
  place: '场所',
};
