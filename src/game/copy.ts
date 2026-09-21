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
  peekDoneHint: {
    simple: '聊一聊，再来投票',
    normal: '大家先聊一聊，随时开始投票',
  } satisfies ModeCopy,
  voteHint: {
    simple: '悄悄选一个人，觉得 TA 是卧底',
    normal: '候选是除你以外的存活玩家，必须投一人',
  } satisfies ModeCopy,
  tieExplain: {
    simple: '再投一次，可以换人',
    normal: '全员直接重投一次，这次可以换票',
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
