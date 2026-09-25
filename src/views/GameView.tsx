import { useState } from 'react';
import type { GameState } from '../game/types';
import type { Action } from '../game/machine';
import { mathRandom } from '../game/rng';
import { ActionButton } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PeekView } from './PeekView';
import { VoteView } from './VoteView';
import { VoteResultView } from './VoteResultView';
import { RevealView } from './RevealView';
import { TieView } from './TieView';
import { FinalView } from './FinalView';

interface GameViewProps {
  state: GameState;
  dispatch: (action: Action) => void;
  /** 「重开本局」：App 负责重新发词（REDEAL） */
  onRestart: () => void;
  /** 「再来一局」：App 负责重新发词（REDEAL），含「换新词啦」过渡屏 */
  onNextGame: () => void;
  onEditRoster: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
}

/** 局内视图编排（P4-P10）：单向线性、无返回导航（DP3） */
export function GameView({ state, dispatch, onRestart, onNextGame, onEditRoster, onLeaderboard, onHome }: GameViewProps) {
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const phase = state.phase;

  return (
    <>
      {(phase.kind === 'peek' || phase.kind === 'peekDone') && (
        <PeekView
          state={state}
          onConfirm={() => dispatch({ type: 'PEEK_CONFIRM' })}
          onHide={() => dispatch({ type: 'PEEK_HIDE' })}
          onStartVote={() => dispatch({ type: 'START_VOTE', rng: mathRandom })}
        />
      )}

      {phase.kind === 'vote' && (
        <VoteView
          state={state}
          onConfirmVoter={() => dispatch({ type: 'VOTER_CONFIRM' })}
          onCastVote={(targetId) => dispatch({ type: 'VOTE_CAST', targetId })}
        />
      )}

      {phase.kind === 'voteResult' && (
        <VoteResultView state={state} onProceed={() => dispatch({ type: 'PROCEED_FROM_RESULT' })} />
      )}

      {(phase.kind === 'tieAnnounce' || phase.kind === 'tieStuck') && (
        <TieView
          state={state}
          onStartTiebreak={() => dispatch({ type: 'START_TIEBREAK' })}
          onNextRound={() => dispatch({ type: 'TIE_STUCK_NEXT', rng: mathRandom })}
        />
      )}

      {phase.kind === 'reveal' && (
        <RevealView
          state={state}
          onFlip={() => dispatch({ type: 'FLIP_IDENTITY' })}
          onContinue={() => dispatch({ type: 'CONTINUE_AFTER_REVEAL', rng: mathRandom })}
        />
      )}

      {phase.kind === 'final' && (
        <FinalView
          state={state}
          onNextGame={onNextGame}
          onEditRoster={onEditRoster}
          onLeaderboard={onLeaderboard}
          onHome={onHome}
        />
      )}

      {/* M2 兜底：连续 3 轮无人出局 */}
      {state.showFallback && (
        <Modal title="😵 连续 3 轮没人出局" body={'大家商量一下，直接指认一人；\n或者重开这一局（不计战绩）'}>
          <div className="modal__actions">
            <ActionButton variant="primary" onClick={() => setConfirmingRestart(true)}>
              🔄 重开本局
            </ActionButton>
            <ActionButton variant="plain" onClick={() => dispatch({ type: 'FALLBACK_CONTINUE' })}>
              商量好了，下一轮
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* M1：重开本局二次确认（防误触） */}
      {confirmingRestart && (
        <Modal
          title="重开这一局？"
          body="重开后本局作废（不计战绩）\n名单不变、重新发词"
          onClose={() => setConfirmingRestart(false)}
        >
          <div className="modal__actions">
            <ActionButton
              variant="danger"
              onClick={() => {
                setConfirmingRestart(false);
                onRestart();
              }}
            >
              确认重开
            </ActionButton>
            <ActionButton variant="plain" onClick={() => setConfirmingRestart(false)}>
              取消
            </ActionButton>
          </div>
        </Modal>
      )}
    </>
  );
}
