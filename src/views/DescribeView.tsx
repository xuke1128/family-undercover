import type { GameState } from '../game/types';
import { COPY, SENTENCE_HINTS } from '../game/copy';
import { alivePlayers, describeOrder, playerById } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';
import { ProgressAvatars } from '../ui/ProgressAvatars';

interface DescribeViewProps {
  state: GameState;
  onNext: () => void;
}

/** P5 描述轮（桌面模式，不传机）；tiebreak=true 即 P9 平票加赛形态 */
export function DescribeView({ state, onNext }: DescribeViewProps) {
  if (state.phase.kind !== 'describe') return null;
  const { index, tiebreak } = state.phase;
  const order = describeOrder(state);
  const current = playerById(state, order[index]);
  const isLast = index === order.length - 1;
  const alive = alivePlayers(state);
  const outPlayers = state.roster.filter((p) => state.eliminatedIds.includes(p.id));

  return (
    <>
      <div className="round-title">
        第 {state.roundNo} 轮 · 描述{state.eliminatedIds.length > 0 && `（还剩 ${alive.length} 人）`}
        {tiebreak && (
          <span className="round-title__banner" role="status">
            ⚖️ 平票加时赛：只听下面的人再各说一句
          </span>
        )}
      </div>

      <ProgressAvatars items={order.map((id) => playerById(state, id))} currentIndex={index} label={`第 ${index + 1}/${order.length} 位`} />

      <div className="describe-hero">
        <span className="describe-hero__avatar">
          <Avatar avatarId={current.avatarId} size="xl" />
        </span>
        <div className="describe-hero__name">轮到{current.name}描述啦</div>
      </div>

      <div className="rule-pill">{COPY.describeRule[state.mode]}</div>

      {state.mode === 'simple' && !tiebreak && (
        <div className="hint-cards" aria-label="句式提示">
          {SENTENCE_HINTS.map((h) => (
            <div className="hint-card" key={h}>
              {h}
            </div>
          ))}
        </div>
      )}

      {outPlayers.length > 0 && (
        <div className="out-row">
          <span>已出局：</span>
          {outPlayers.map((p) => (
            <span className="out-row__tag" key={p.id}>
              <Avatar avatarId={p.avatarId} size="sm" dimmed />
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="footer-actions">
        <ActionButton variant="primary" onClick={onNext}>
          {isLast ? (tiebreak ? '重新投票 🗳️' : '开始投票 🗳️') : '说完啦，下一位 →'}
        </ActionButton>
      </div>
    </>
  );
}
