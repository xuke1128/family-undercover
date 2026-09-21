import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

/**
 * QA 补充：局前设置 UI 边界（US2/US9）。
 * 现有 setupBoundary.smoke 只覆盖「简单 6 人上限 / 一键切普通 / 切回被拦」，
 * 此处补：普通模式 12 人上限的 UI 行为、模式说明不泄露卧底数量（02-design §7-1）、
 * 头像弹层的占用规则与 4 原创 + 50 emoji 构成（M1）。
 */

describe('QA 局前设置：普通模式 12 人上限', () => {
  it('普通模式可加至 12 人；第 13 人被拦（添加按钮置灰 + 「最多 12 人」）', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();

    // 切普通模式（当前 4 人，允许）；说明行不含卧底数量（02-design §7-1）
    await user.click(screen.getByRole('radio', { name: '🎭 普通' }));
    const note = await screen.findByText('普通：3-12 人 · 全词库 · 经典规则');
    expect(note).toBeVisible();
    expect(note.textContent).not.toContain('卧底');

    // 从 4 人加到 12 人
    const extras = ['爷爷', '奶奶', '叔叔', '姑姑', '舅舅', '姨妈', '姐姐', '弟弟'];
    for (let i = 0; i < extras.length; i++) {
      await user.click(screen.getByRole('button', { name: '＋ 添加玩家' }));
      await user.type(screen.getByLabelText('新玩家昵称'), extras[i]);
      await user.click(screen.getByRole('button', { name: '保存' }));
      expect(await screen.findByText(`玩家 ${5 + i}/12`)).toBeVisible();
    }
    expect(screen.getByText('玩家 12/12')).toBeVisible();

    // 第 13 人：添加按钮置灰并提示最多 12 人
    const add = screen.getByRole('button', { name: '最多 12 人' });
    expect(add).toBeDisabled();
    expect(screen.queryByRole('button', { name: '＋ 添加玩家' })).not.toBeInTheDocument();
  }, 60000);
});

describe('QA 头像弹层（S1/M1）', () => {
  it('4 个原创置顶 + emoji 50 个；他人已占用置灰不可选；换出的头像释放可再选', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: '▶ 开始游戏' }, { timeout: 2500 }));
    expect(await screen.findByText('玩家 4/6')).toBeVisible();

    // 打开爸爸的头像弹层（爸爸当前持有「暖爸」）
    await user.click(screen.getByRole('button', { name: '换 爸爸 的头像' }));
    expect(await screen.findByRole('dialog', { name: '选一个头像' })).toBeVisible();

    // 4 个原创头像 + 数量标注
    expect(screen.getByText('共 4 个')).toBeVisible();
    expect(screen.getByText('共 50 个')).toBeVisible();
    // 自己持有的「暖爸」可再选（不与他人冲突）；其余 3 个原创已被家人占用
    expect(screen.getByRole('button', { name: '暖爸' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '甜妈（已被选）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '像素小子（已被选）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '粉兜兔（已被选）' })).toBeDisabled();

    // 切到食物分组，给爸爸选 🍓
    await user.click(screen.getByRole('tab', { name: '食物' }));
    await user.click(screen.getByRole('button', { name: '头像 🍓' }));
    expect(screen.queryByRole('dialog', { name: '选一个头像' })).not.toBeInTheDocument();

    // 打开妈妈的弹层（默认回到动物分组）：🍓 已被爸爸占用（置灰）；爸爸让出的「暖爸」已释放可选
    await user.click(screen.getByRole('button', { name: '换 妈妈 的头像' }));
    expect(await screen.findByRole('dialog', { name: '选一个头像' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: '食物' }));
    expect(screen.getByRole('button', { name: '🍓（已被选）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '暖爸' })).toBeEnabled();
  }, 30000);
});
