import { useState } from 'react';
import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { playerById } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';
import { HandoffCard } from '../ui/HandoffCard';
import { ProgressAvatars } from '../ui/ProgressAvatars';

interface VoteViewProps {
  state: GameState;
  onConfirmVoter: () => void;
  onCastVote: (targetId: string) => void;
}

/**
 * P6 传机投票（两态）：交接确认 → 秘密投票；候选不含自己与已出局者（US5）。
 * v0.3.0（PRD §9-15）：交接卡、进度头像条与候选卡均按本轮随机序 voteOrder 排列；
 * 平票重投轮（tiebreak=true）沿用本轮顺序，故本组件无需感知重排。
 */
export function VoteView({ state, onConfirmVoter, onCastVote }: VoteViewProps) {
  if (state.phase.kind !== 'vote') return null;
  const { index, confirmed, tiebreak } = state.phase;
  // 本轮随机序（machine 保证只含存活者；平票重投沿用同一顺序）
  const voters = state.voteOrder.map((id) => playerById(state, id));
  const voter = voters[index];
  const outPlayers = state.roster.filter((p) => state.eliminatedIds.includes(p.id));

  // 顶部横幅：平票重投轮（可换票）标注，或下一轮轮次提示（02-design P6/F5/F6）
  const roundBanner = tiebreak
    ? '🔄 重新投票 · 可以换票'
    : state.roundNo > 1
      ? `第 ${state.roundNo} 轮 · 还剩 ${voters.length} 人`
      : null;

  if (!confirmed) {
    return (
      <>
        {roundBanner && (
          <div className="round-title">
            <span className="round-title__banner" role="status">
              {roundBanner}
            </span>
          </div>
        )}
        <ProgressAvatars items={voters} currentIndex={index} label={`投票 ${index + 1}/${voters.length}`} />
        <HandoffCard player={voter} actionLabel="是我，投票 🤫" onAction={onConfirmVoter} />
      </>
    );
  }

  return (
    <>
      {roundBanner && (
        <div className="round-title">
          <span className="round-title__banner" role="status">
            {roundBanner}
          </span>
        </div>
      )}
      <Ballot
        key={voter.id}
        state={state}
        voterId={voter.id}
        orderIds={state.voteOrder}
        onCastVote={onCastVote}
      />
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
    </>
  );
}

function Ballot({
  state,
  voterId,
  orderIds,
  onCastVote,
}: {
  state: GameState;
  voterId: string;
  orderIds: readonly string[];
  onCastVote: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const voter = playerById(state, voterId);
  // 候选卡按本轮随机序排列，排除自己；出局者本就不在 voteOrder 中
  const candidates = orderIds.filter((id) => id !== voterId).map((id) => playerById(state, id));
  const selectedPlayer = selected ? playerById(state, selected) : null;

  return (
    <>
      <div className="vote-head">
        <div className="vote-head__title">{voter.name}，你觉得谁是卧底？</div>
        <div className="vote-head__sub">🤫 {COPY.voteHint[state.mode]}</div>
      </div>
      <div className="candidate-grid" role="radiogroup" aria-label="候选人">
        {candidates.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected === p.id}
            className={`candidate-card ${selected === p.id ? 'candidate-card--selected' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <Avatar avatarId={p.avatarId} size="lg" />
            <span className="candidate-card__name">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="footer-actions">
        <ActionButton
          variant="primary"
          disabled={selected == null}
          onClick={() => selected && onCastVote(selected)}
        >
          {selectedPlayer ? `投给 ${selectedPlayer.name}` : '先选一个人'}
        </ActionButton>
      </div>
    </>
  );
}
