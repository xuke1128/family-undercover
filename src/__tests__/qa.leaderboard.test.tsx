import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

/**
 * QA 补充：排行榜展示、持久化与清空（US8，PRD §3.5/§3.7-3.5）。
 * 排序纯函数已有 storage.test 覆盖，此处验证：
 * - UI 按「胜场降序 → 胜率」展示（含前三名次标记）；
 * - 关闭后重开（卸载重挂载 + 重新读取 localStorage）战绩仍在；
 * - 清空战绩必须二次确认：取消不生效、确认后回空态且本机数据清空。
 */

const STORE_KEY = 'family-undercover:store';

function seedStore(): void {
  window.localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      v:  1,
      profiles: {
        '妹妹#custom:pinkbunny': { name: '妹妹', avatarId: 'custom:pinkbunny', games: 10, wins: 5 },
        '小美#emoji:🐵': { name: '小美', avatarId: 'emoji:🐵', games: 4, wins: 3 },
        '爸爸#custom:nuandad': { name: '爸爸', avatarId: 'custom:nuandad', games: 5, wins: 3 },
        '爷爷#emoji:🐯': { name: '爷爷', avatarId: 'emoji:🐯', games: 3, wins: 0 },
      },
      recentPairs: [],
    }),
  );
}

const rowNames = (): string[] =>
  Array.from(document.querySelectorAll('.rank-row__name')).map((el) => el.textContent ?? '');

async function openLeaderboard(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: '🏆 家庭排行榜' }, { timeout: 2500 }));
}

describe('QA 排行榜与战绩持久化（US8）', () => {
  it('按胜场降序、同胜场按胜率排序展示；卸载重挂载后战绩仍在', async () => {
    seedStore();
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await openLeaderboard(user);

    // 期望顺序：妹妹(5胜) → 小美(3胜/4局 75%) → 爸爸(3胜/5局 60%) → 爷爷(0胜)
    await waitFor(() => expect(rowNames()).toEqual(['妹妹', '小美', '爸爸', '爷爷']));
    expect(screen.getByText('3 胜 / 4 局')).toBeVisible();
    expect(screen.getByText('75%')).toBeVisible();
    expect(document.querySelector('.rank-row__no')?.getAttribute('aria-label')).toBe('第 1 名');

    // 模拟「关闭页面重开」：卸载后重新挂载，战绩仍从本机读出
    unmount();
    const user2 = userEvent.setup();
    render(<App />);
    await openLeaderboard(user2);
    await waitFor(() => expect(rowNames()).toEqual(['妹妹', '小美', '爸爸', '爷爷']));
  }, 30000);
});

describe('QA 清空战绩二次确认（US8/M1）', () => {
  it('取消不清空；确认后回空态且本机档案清空', async () => {
    seedStore();
    const user = userEvent.setup();
    render(<App />);
    await openLeaderboard(user);
    await waitFor(() => expect(rowNames()).toHaveLength(4));

    // 第一步点击 → 弹出二次确认；此时榜单仍在
    await user.click(screen.getByRole('button', { name: '🗑️ 清空战绩' }));
    expect(await screen.findByRole('dialog', { name: '确定清空所有战绩？' })).toBeVisible();
    expect(screen.getByText('清空后找不回来哦')).toBeVisible();
    expect(rowNames()).toHaveLength(4);

    // 取消：不生效
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '确定清空所有战绩？' })).not.toBeInTheDocument();
    expect(rowNames()).toHaveLength(4);

    // 确认清空：回空态，本机数据清空
    await user.click(screen.getByRole('button', { name: '🗑️ 清空战绩' }));
    await user.click(await screen.findByRole('button', { name: '清空' }));
    expect(await screen.findByText('还没有战绩')).toBeVisible();
    expect(screen.getByText('快开一局，看看谁是卧底！')).toBeVisible();
    expect(rowNames()).toHaveLength(0);

    const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}') as {
      v: number;
      profiles: Record<string, unknown>;
    };
    expect(saved.v).toBe(1);
    expect(saved.profiles).toEqual({});
  }, 30000);
});
