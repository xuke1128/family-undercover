import type { GameState } from '../game/types';
import { aliveIds, currentTally, playerById } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';

interface VoteResultViewProps {
  state: GameState;
  onProceed: () => void;
}

/** P7 票型公示：得票条形（降序）+ 谁投了谁明细；平票行黄描边（M5/US6） */
export function VoteResultView({ state, onProceed }: VoteResultViewProps) {
  if (state.phase.kind !== 'voteResult') return null;
  const alive = aliveIds(state);
  const tally = currentTally(state);
  const rows = [...alive].sort((a, b) => (tally.counts[b] ?? 0) - (tally.counts[a] ?? 0));

  return (
    <>
      <div className="round-title">
        {state.phase.tiebreak ? '重新投票 · 结果 🗳️' : '投票结果 🗳️'}
      </div>

      <div className="tally-list" aria-label="得票数">
        {rows.map((id) => {
          const p = playerById(state, id);
          const count = tally.counts[id] ?? 0;
          const isTop = tally.maxCount > 0 && count === tally.maxCount;
          return (
            <div key={id} className={`tally-row ${isTop ? 'tally-row--top' : ''}`}>
              <Avatar avatarId={p.avatarId} size="md" />
              <span className="tally-row__name">{p.name}</span>
              <span className="tally-row__bar-track" aria-hidden="true">
                <span
                  className="tally-row__bar"
                  style={{ width: tally.maxCount > 0 ? `${(count / tally.maxCount) * 100}%` : '0%' }}
                />
              </span>
              <span className="tally-row__count">
                {count} 票
              </span>
            </div>
          );
        })}
      </div>

      <div className="ballot-list">
        <p className="ballot-list__title">大家是这样投的：</p>
        {state.votes.map((v, i) => {
          const voter = playerById(state, v.voterId);
          const target = playerById(state, v.targetId);
          return (
            <div className="ballot-row" key={`${v.voterId}-${i}`}>
              <Avatar avatarId={voter.avatarId} size="sm" />
              <span>{voter.name}</span>
              <span className="ballot-row__arrow" aria-hidden="true">
                ➜
              </span>
              <Avatar avatarId={target.avatarId} size="sm" />
              <span>{target.name}</span>
            </div>
          );
        })}
      </div>

      <div className="footer-actions">
        <ActionButton variant="primary" onClick={onProceed}>
          {tally.isTie ? '重新投一次 ▶' : '揭晓出局者 ▶'}
        </ActionButton>
      </div>
    </>
  );
}
