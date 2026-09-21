import { useState } from 'react';
import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { alivePlayers, playerById } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';
import { HandoffCard } from '../ui/HandoffCard';
import { ProgressAvatars } from '../ui/ProgressAvatars';

interface VoteViewProps {
  state: GameState;
  onConfirmVoter: () => void;
  onCastVote: (targetId: string) => void;
}

/** P6 传机投票（两态）：交接确认 → 秘密投票；候选不含自己与已出局者（US6） */
export function VoteView({ state, onConfirmVoter, onCastVote }: VoteViewProps) {
  if (state.phase.kind !== 'vote') return null;
  const { index, confirmed, tiebreak } = state.phase;
  const alive = alivePlayers(state);
  const voter = alive[index];
  const outPlayers = state.roster.filter((p) => state.eliminatedIds.includes(p.id));

  if (!confirmed) {
    return (
      <>
        <ProgressAvatars items={alive} currentIndex={index} label={`投票 ${index + 1}/${alive.length}`} />
        <HandoffCard player={voter} actionLabel="是我，投票 🤫" onAction={onConfirmVoter} />
      </>
    );
  }

  return (
    <>
      {tiebreak && (
        <div className="round-title">
          <span className="round-title__banner" role="status">
            ⚖️ 重新投票
          </span>
        </div>
      )}
      <Ballot
        key={voter.id}
        state={state}
        voterId={voter.id}
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
  onCastVote,
}: {
  state: GameState;
  voterId: string;
  onCastVote: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const alive = alivePlayers(state);
  const voter = playerById(state, voterId);
  const candidates = alive.filter((p) => p.id !== voterId);
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
