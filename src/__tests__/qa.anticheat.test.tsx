import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Player } from '../game/types';

/**
 * QA 补充：防偷看结构性验证（US3 / 02-design F2 硬性约束、DP3）。
 * 现有 app.smoke 已验证「隐藏后词消失」，此处补齐：
 * - 交接态 A（未确认身份）时任何玩家的词都不在 DOM；
 * - 看词完成过渡 / 投票交接 / 投票选票 / 票型公示各屏均无词语（词仅存在于看词态 B 与揭晓/结算）；
 * - 局内（P4-P7）无任何返回/回首页导航；
 * - 投票候选不含自己；
 * - 出局揭晓与终局结算按规则亮词（US6：出局者亮身份与词）。
 */
vi.mock('../game/dealer', () => ({
  dealGame: (roster: Player[]) => ({
    pair: { id: 'animal-e1', category: 'animal' as const, difficulty: 'easy' as const, civilian: '猫', undercover: '狗' },
    roles: Object.fromEntries(roster.map((p, i) => [p.id, i === 1 ? ('undercover' as const) : ('civilian' as const)])),
  }),
  pushRecentPair: (recent: string[], id: string) => [id, ...recent.filter((r) => r !== id)].slice(0, 10),
  RECENT_PAIR_LIMIT: 10,
}));

import App from '../App';

const names = ['爸爸', '妈妈', '哥哥', '妹妹'];
const WORDS = ['猫', '狗'];

const expectNoWordAnywhere = () => {
  for (const w of WORDS) {
    expect(screen.queryByText(w, { exact: false }), `界面不应出现词「${w}」`).not.toBeInTheDocument();
  }
};

const expectNoBackNavigation = () => {
  expect(screen.queryByRole('button', { name: '回首页' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '返回' })).not.toBeInTheDocument();
};

describe('QA 防偷看与局内导航（US3/DP3）', () => {
  it('词仅在看词态 B 渲染；其余各屏无词、无返回导航；候选不含自己；揭晓按规则亮词', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '开始游戏' }));

    // P4 态 A：交接确认屏无任何词、无返回导航（妈妈是卧底，词「狗」不得出现）
    expect(await screen.findByText('下一个是')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();

    // 逐人看词：态 B 有词（本人），隐藏后立即消失；下一位态 A 无词
    const wordsOf = ['猫', '狗', '猫', '猫'];
    for (let i = 0; i < names.length; i++) {
      await user.click(screen.getByRole('button', { name: '是我，看词 🙈' }));
      expect(await screen.findByText(wordsOf[i])).toBeVisible();
      await user.click(screen.getByRole('button', { name: '记住啦，隐藏 🙊' }));
      expectNoWordAnywhere();
    }

    // P4 态 C（看词完成过渡）：无词、无返回；直接开始投票（无描述环节）
    expect(await screen.findByText('词都记住啦！')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();
    expect(screen.queryByRole('button', { name: '开始描述 🎤' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始投票 🗳️' }));

    // P6 投票交接态：无词、无返回
    expect(await screen.findByText('下一个是')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();

    // 第一位投票人（爸爸）：候选不含自己，无词
    await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
    expect(await screen.findByText('爸爸，你觉得谁是卧底？')).toBeVisible();
    expectNoWordAnywhere();
    expect(screen.queryByRole('radio', { name: '爸爸' })).not.toBeInTheDocument();
    for (const other of ['妈妈', '哥哥', '妹妹']) {
      expect(screen.getByRole('radio', { name: other })).toBeEnabled();
    }

    // 全员投票：除妈妈外都投妈妈（卧底），妈妈投爸爸；每位先经交接确认，交接屏无词
    for (const voter of names) {
      if (voter !== '爸爸') {
        expect(await screen.findByText('下一个是')).toBeVisible();
        expectNoWordAnywhere();
        await user.click(screen.getByRole('button', { name: '是我，投票 🤫' }));
        expect(await screen.findByText(`${voter}，你觉得谁是卧底？`)).toBeVisible();
      }
      const target = voter === '妈妈' ? '爸爸' : '妈妈';
      await user.click(screen.getByRole('radio', { name: target }));
      await user.click(screen.getByRole('button', { name: `投给 ${target}` }));
    }

    // P7 票型公示：无词、无返回；4 行「谁投谁」明细
    expect(await screen.findByText('投票结果 🗳️')).toBeVisible();
    expectNoWordAnywhere();
    expectNoBackNavigation();
    expect(screen.getByText('大家是这样投的：')).toBeVisible();

    // P8 第一段（先亮人）：无词
    await user.click(screen.getByRole('button', { name: '揭晓出局者 ▶' }));
    expect(await screen.findByText('出局的是……')).toBeVisible();
    expectNoWordAnywhere();

    // P8 第二段：按 US7 亮明身份与词语
    await user.click(screen.getByRole('button', { name: '翻开身份 🎴' }));
    expect(await screen.findByText('🎭 卧底！')).toBeVisible();
    expect(screen.getByText('他的词：').textContent).toBe('他的词：狗');

    // P10 结算：全员身份与词公开（终局无保密需求）
    await user.click(screen.getByRole('button', { name: '继续 ▶' }));
    expect(await screen.findByText('🎉 平民胜利！')).toBeVisible();
    expect(screen.getByText('平民词：猫')).toBeVisible();
    expect(screen.getByText('卧底词：狗')).toBeVisible();
    expect(screen.getAllByText('词语：猫')).toHaveLength(3);
    expect(screen.getAllByText('词语：狗')).toHaveLength(1);
  }, 30000);
});
