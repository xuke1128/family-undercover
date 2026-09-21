import { useMemo } from 'react';
import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { roleOf, wordOf } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';

interface FinalViewProps {
  state: GameState;
  onNextGame: () => void;
  onEditRoster: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
}

const CONFETTI_COLORS = {
  civilian: ['#F0633F', '#FFC94D', '#3EC9A7', '#8C6FE6', '#FF8A5C'],
  undercover: ['#8C6FE6', '#A48BF0', '#6B4FC4', '#C9B8F5', '#F0EAFE'],
} as const;

/** P10 终局结算（US7/US8）：胜负宣告 + 身份/词全公开 + 计分标记 + 连局入口 */
export function FinalView({ state, onNextGame, onEditRoster, onLeaderboard, onHome }: FinalViewProps) {
  const winner = state.phase.kind === 'final' ? state.winner : null;

  // Hook 必须无条件调用；非结算相位时置空
  const confetti = useMemo(() => {
    if (!winner) return [];
    const colors = CONFETTI_COLORS[winner];
    return Array.from({ length: 26 }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      color: colors[i % colors.length],
      delay: `${(i % 8) * 0.12}s`,
      rotate: `${(i * 53) % 360}deg`,
    }));
  }, [winner]);

  if (!winner) return null;
  const isCivilianWin = winner === 'civilian';

  return (
    <>
      <div className="final-hero">
        <div className="confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <i
              key={i}
              style={{ ['--x' as string]: c.left, ['--c' as string]: c.color, ['--d' as string]: c.delay, ['--r' as string]: c.rotate }}
            />
          ))}
        </div>
        <div className={`final-hero__title final-hero__title--${winner}`}>
          {isCivilianWin ? '🎉 平民胜利！' : '🎭 卧底胜利！'}
        </div>
        <div className="final-hero__sub">{COPY.finalSub[winner][state.mode]}</div>
        <div className="word-chips">
          <span className="word-chip word-chip--civilian">平民词：{state.assignment.pair.civilian}</span>
          <span className="word-chip word-chip--undercover">卧底词：{state.assignment.pair.undercover}</span>
        </div>
      </div>

      <div className="card final-list" aria-label="全员身份">
        {state.roster.map((p) => {
          const role = roleOf(state, p.id);
          const isWinner = role === winner;
          const isOut = state.eliminatedIds.includes(p.id);
          return (
            <div className="final-row" key={p.id}>
              <Avatar avatarId={p.avatarId} size="md" dimmed={isOut} />
              <div className="final-row__name">
                <div className="final-row__name-main">
                  {p.name}
                  {isOut && <span className="out-tag">已出局</span>}
                </div>
                <div className="final-row__word">词语：{wordOf(state, p.id)}</div>
              </div>
              <span className={`role-badge role-badge--${role}`}>{role === 'undercover' ? '🎭 卧底' : '🌱 平民'}</span>
              {isWinner && <span className="win-badge">✪ +1胜</span>}
            </div>
          );
        })}
      </div>

      <div className="footer-actions">
        <ActionButton variant="primary" onClick={onNextGame}>
          🔁 再来一局
        </ActionButton>
        <ActionButton variant="secondary" onClick={onEditRoster}>
          ✏️ 修改名单
        </ActionButton>
        <div className="final-links">
          <button type="button" className="btn-text-link" onClick={onLeaderboard}>
            🏆 排行榜
          </button>
          <span aria-hidden="true" style={{ color: 'var(--ink-3)' }}>
            ·
          </span>
          <button type="button" className="btn-text-link" onClick={onHome}>
            🏠 首页
          </button>
        </div>
      </div>
    </>
  );
}
