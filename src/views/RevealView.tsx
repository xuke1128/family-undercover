import type { GameState } from '../game/types';
import { playerById, roleOf, wordOf } from '../game/machine';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';

interface RevealViewProps {
  state: GameState;
  onFlip: () => void;
  onContinue: () => void;
}

/** P8 出局揭晓（两段式，US7）：先亮人 → 手动翻身份卡（身份 + 词语） */
export function RevealView({ state, onFlip, onContinue }: RevealViewProps) {
  if (state.phase.kind !== 'reveal') return null;
  const player = playerById(state, state.phase.eliminatedId);
  const role = roleOf(state, player.id);
  const word = wordOf(state, player.id);

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

  return (
    <div className="reveal-stage">
      <div className={`identity-card identity-card--${role}`}>
        <div className="identity-card__role">{role === 'undercover' ? '🎭 卧底！' : '🌱 平民'}</div>
        <div className="identity-card__word">
          他的词：<strong>{word}</strong>
        </div>
      </div>
      <ActionButton variant="primary" onClick={onContinue}>
        继续 ▶
      </ActionButton>
    </div>
  );
}
