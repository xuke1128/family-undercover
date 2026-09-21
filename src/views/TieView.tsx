import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { currentTally, playerById } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';

interface TieViewProps {
  state: GameState;
  onStartTiebreak: () => void;
  onNextRound: () => void;
}

/** P9 平票处理（US6，PRD §3.3）：平票公告（全员直接重投一次，可换票）/ 仍平票宣布 */
export function TieView({ state, onStartTiebreak, onNextRound }: TieViewProps) {
  if (state.phase.kind === 'tieAnnounce') {
    const tally = currentTally(state);
    return (
      <div className="stage-center">
        <div className="stage-center__emoji" aria-hidden="true">
          ⚖️
        </div>
        <div className="stage-center__title">平票啦！</div>
        <div className="tie-players">
          {state.tiebreakIds.map((id) => {
            const p = playerById(state, id);
            return (
              <div className="tie-player" key={id}>
                <Avatar avatarId={p.avatarId} size="lg" />
                <span>
                  {p.name} {tally.counts[id] ?? 0} 票
                </span>
              </div>
            );
          })}
        </div>
        <div className="stage-center__sub">{COPY.tieExplain[state.mode]}</div>
        <ActionButton variant="primary" onClick={onStartTiebreak}>
          重新投票 🗳️
        </ActionButton>
      </div>
    );
  }

  if (state.phase.kind === 'tieStuck') {
    return (
      <div className="stage-center">
        <div className="stage-center__emoji" aria-hidden="true">
          😅
        </div>
        <div className="stage-center__title">还是平票</div>
        <div className="stage-center__sub">{COPY.tieStuck[state.mode]}</div>
        <ActionButton variant="primary" onClick={onNextRound}>
          下一轮 ▶
        </ActionButton>
      </div>
    );
  }

  return null;
}
