import type { GameState } from '../game/types';
import { COPY } from '../game/copy';
import { playerById, roleOf } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';

interface RevealViewProps {
  state: GameState;
  onFlip: () => void;
  onContinue: () => void;
}

/**
 * P8 出局揭晓（两段式，US6）：先亮人 → 手动翻身份卡。
 * v0.3.0（PRD §9-14）：第二段只亮身份、不亮词——亮出卧底词会暗示平民词；
 * 词语的唯一公开时机是终局结算页（FinalView）。
 */
export function RevealView({ state, onFlip, onContinue }: RevealViewProps) {
  if (state.phase.kind !== 'reveal') return null;
  const player = playerById(state, state.phase.eliminatedId);
  const role = roleOf(state, player.id);

  if (!state.phase.flipped) {
    return (
      <div className="reveal-stage">
        <div className="reveal-stage__title">揭晓时刻 🔍</div>
        <div className="handoff__avatar-ring">
          <Avatar avatarId={player.avatarId} size="xxl" />
        </div>
        <div className="reveal-stage__title">出局的是……</div>
        <div className="reveal-stage__name">{player.name}</div>
        <ActionButton variant="primary" tall onClick={onFlip} style={{ background: 'var(--mystery)', boxShadow: '0 5px 14px rgba(140,111,230,0.35)' }}>
          翻开身份 🎴
        </ActionButton>
      </div>
    );
  }

  // 第二段「亮身份」（p08b）：卡上只有头像、名字、身份三要素，全页无任何词语
  return (
    <div className="reveal-stage">
      <div className="reveal-stage__title">揭晓时刻 🔍</div>
      <div className="reveal-stage__lead">出局的是 {player.name}，他的身份是——</div>
      <div className={`identity-card identity-card--${role}`}>
        <span className="identity-card__sparkle identity-card__sparkle--tl" aria-hidden="true">
          ✦
        </span>
        <span className="identity-card__sparkle identity-card__sparkle--tr" aria-hidden="true">
          ✦
        </span>
        <span className="identity-card__sparkle identity-card__sparkle--bl" aria-hidden="true">
          ✦
        </span>
        <span className="identity-card__sparkle identity-card__sparkle--br" aria-hidden="true">
          ✦
        </span>
        <div className="identity-card__avatar-ring">
          <Avatar avatarId={player.avatarId} size="xl" />
        </div>
        <div className="identity-card__name">{player.name}</div>
        <div className="identity-card__divider" aria-hidden="true" />
        <div className="identity-card__role">{role === 'undercover' ? '🎭 卧底！' : '🌱 平民！'}</div>
      </div>
      <div className="reveal-stage__hint">{COPY.revealSecretHint[state.mode]}</div>
      <div className="reveal-stage__note">{COPY.revealWatchNote[state.mode]}</div>
      <ActionButton variant="primary" onClick={onContinue}>
        继续 ▶
      </ActionButton>
    </div>
  );
}
