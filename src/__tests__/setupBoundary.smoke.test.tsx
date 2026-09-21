import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

/**
 * 关键路径冒烟 2：简单模式人数边界（US2/US9 验收口径）——
 * 第 7 人被拦并提示一键切换普通模式；切换后名单保留；
 * 普通 >6 人切回简单被阻止；删减后可切换，昵称头像不受影响。
 */
describe('局前设置边界：简单模式 6 人上限', () => {
  it('第 7 人被拦 → 一键切普通 → 名单保留可加人 → 切回被拦 → 删减后可切回', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();

    // 添加到 6 人（简单模式满员）
    const addAndSave = async (name: string) => {
      await user.click(screen.getByRole('button', { name: '＋ 添加玩家' }));
      await user.type(screen.getByLabelText('新玩家昵称'), name);
      await user.click(screen.getByRole('button', { name: '保存' }));
      expect(await screen.findByText(name)).toBeVisible();
    };
    await addAndSave('爷爷');
    expect(await screen.findByText('玩家 5/6')).toBeVisible();
    await addAndSave('奶奶');
    expect(await screen.findByText('玩家 6/6')).toBeVisible();

    // 简单模式 6 人满员点添加：不进入添加态，升起驻留横幅
    await user.click(screen.getByRole('button', { name: '＋ 添加玩家' }));
    expect(await screen.findByText('简单模式最多 6 人')).toBeVisible();
    expect(screen.queryByLabelText('新玩家昵称')).not.toBeInTheDocument(); // 第 7 人未被添加
    expect(screen.getByText('玩家 6/6')).toBeVisible();

    // 一键切换普通模式：全部名单保留，横幅消失
    await user.click(screen.getByRole('button', { name: '切换到普通模式' }));
    expect(await screen.findByText('玩家 6/12')).toBeVisible();
    expect(screen.queryByText('简单模式最多 6 人')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '🎭 普通' })).toHaveAttribute('aria-checked', 'true');
    // 预填名单仍在
    for (const n of ['爸爸', '妈妈', '哥哥', '妹妹', '爷爷', '奶奶']) {
      expect(screen.getByText(n)).toBeVisible();
    }

    // 可继续添加第 7 人
    await addAndSave('叔叔');
    expect(await screen.findByText('玩家 7/12')).toBeVisible();

    // >6 人切回简单被阻止（提示先删减，无切换按钮）
    await user.click(screen.getByRole('radio', { name: '🍬 简单模式' }));
    expect(await screen.findByText('简单模式最多 6 人，请先删减玩家')).toBeVisible();
    expect(screen.queryByRole('button', { name: '切换到普通模式' })).not.toBeInTheDocument();
    // 阻止后模式仍为普通
    expect(screen.getByRole('radio', { name: '🎭 普通' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: '知道了' }));

    // 删至 6 人后可正常切换，昵称不受影响
    await user.click(screen.getByRole('button', { name: '删除 叔叔' }));
    expect(await screen.findByText('已删除 叔叔')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: '🍬 简单模式' }));
    expect(await screen.findByText('玩家 6/6')).toBeVisible();
    expect(screen.getByRole('radio', { name: '🍬 简单模式' })).toHaveAttribute('aria-checked', 'true');
    for (const n of ['爸爸', '妈妈', '哥哥', '妹妹', '爷爷', '奶奶']) {
      expect(screen.getByText(n)).toBeVisible();
    }
  }, 30000);

  it('人数不足 3 人不可开局：删除至 2 人时按钮置灰并提示', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '删除 哥哥' }));
    await user.click(screen.getByRole('button', { name: '删除 妹妹' }));

    const start = await screen.findByRole('button', { name: '开始游戏' });
    expect(start).toBeDisabled();
    expect(screen.getByText('还差 1 名玩家（至少 3 人）')).toBeVisible();
  }, 30000);
});
