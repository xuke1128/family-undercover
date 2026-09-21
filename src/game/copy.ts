/** 双模式文案表（02-design §5.2）：关键流程双份，其余共用一套。 */

import type { Camp, GameMode } from './types';

type ModeCopy = Record<GameMode, string>;

export const COPY = {
  peekHint: {
    simple: '自己看，别给别人看哦',
    normal: '别让其他人看到屏幕',
  } satisfies ModeCopy,
  wordCardHint: {
    simple: '别把词说出来！',
    normal: '不能说出这个词',
  } satisfies ModeCopy,
  describeRule: {
    simple: '说一句话，别把词说出来！',
    normal: '用一句话描述：不能说词、不能说字、说不出可以说「过」',
  } satisfies ModeCopy,
  voteHint: {
    simple: '悄悄选一个人，觉得 TA 是卧底',
    normal: '候选是除你以外的存活玩家，必须投一人',
  } satisfies ModeCopy,
  tieExplain: {
    simple: '他们再说一句，大家再投一次',
    normal: '平票者各再描述一句，全员重新投票',
  } satisfies ModeCopy,
  tieStuck: {
    simple: '这轮没人出局，再来！',
    normal: '本轮无人出局，进入下一轮',
  } satisfies ModeCopy,
  finalSub: {
    civilian: { simple: '找到所有卧底啦！', normal: '卧底被全部找出' },
    undercover: { simple: '卧底藏得真好！', normal: '卧底坚持到最后' },
  } satisfies Record<Camp, ModeCopy>,
} as const;

/** 简单模式描述句式提示卡（M4/US5/US9），孩子照读即可完成描述 */
export const SENTENCE_HINTS: readonly string[] = [
  '它是一种动物',
  '它是甜的',
  '我在家里见过它',
  '它喜欢动来动去',
  '它有很多颜色',
];
