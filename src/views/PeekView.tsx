import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { playerById, wordOf } from '../game/machine';
import { ActionButton } from '../ui/Button';
import { HandoffCard } from '../ui/HandoffCard';
import { ProgressAvatars } from '../ui/ProgressAvatars';

interface PeekViewProps {
  state: GameState;
  onConfirm: () => void;
  onHide: () => void;
  onStartVote: () => void;
}

/**
 * P4 传机看词（防偷看核心页，US3/US4）：
 * 态 A 交接确认 → 态 B 翻牌显词 → 「记住啦，隐藏」→ 下一位；全部看完进完成态，
 * 点「开始投票」直接进入 P6（无描述环节）。
 * 词语文本只在态 B 渲染（本文件 wordOf 的唯一调用点），其余视图不引用。
 */
export function PeekView({ state, onConfirm, onHide, onStartVote }: PeekViewProps) {
  if (state.phase.kind !== 'peek' && state.phase.kind !== 'peekDone') return null;
  const mode = state.mode;

  if (state.phase.kind === 'peekDone') {
    return (
      <div className="stage-center">
        <div className="stage-center__emoji" aria-hidden="true">
          🎉
        </div>
        <div className="stage-center__title">词都记住啦！</div>
        <div className="stage-center__sub">{COPY.peekDoneHint[mode]}</div>
        <ActionButton variant="primary" onClick={onStartVote}>
          开始投票 🗳️
        </ActionButton>
      </div>
    );
  }

  const player = playerById(state, state.roster[state.phase.index].id);

  if (!state.phase.revealed) {
    return (
      <>
        <ProgressAvatars
          items={state.roster}
          currentIndex={state.phase.index}
          label={`看词 ${state.phase.index + 1}/${state.roster.length}`}
        />
        <HandoffCard
          player={player}
          actionLabel="是我，看词 🙈"
          onAction={onConfirm}
          subNote="其他人别偷看哦 😉"
        />
      </>
    );
  }

  // 态 B：看词。词语只在此处出现，点「记住啦，隐藏」后本组件即卸载
  const word = wordOf(state, player.id);
  return (
    <div className="word-stage">
      <div className="word-stage__lead">{player.name}，这是你的词</div>
      <div className="word-card">
        <span className="word-card__sparkle word-card__sparkle--tl" aria-hidden="true">
          ✦
        </span>
        <span className="word-card__sparkle word-card__sparkle--tr" aria-hidden="true">
          ✦
        </span>
        <span className="word-card__sparkle word-card__sparkle--bl" aria-hidden="true">
          ✦
        </span>
        <span className="word-card__sparkle word-card__sparkle--br" aria-hidden="true">
          ✦
        </span>
        <h2 className={`word-card__word ${word.length > 2 ? 'word-card__word--long' : ''}`}>{word}</h2>
        <div className="word-card__underline" />
        <div className="word-card__only-you">这个词只有你能看到</div>
      </div>
      <div className="word-hint-pill">🤫 {COPY.wordCardHint[mode]}</div>
      <ActionButton variant="primary" tall onClick={onHide}>
        记住啦，隐藏 🙊
      </ActionButton>
      <div className="word-hidden-note">记住后点上方按钮，词就会藏起来</div>
    </div>
  );
}
