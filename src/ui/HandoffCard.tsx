import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { ActionButton } from './Button';

interface HandoffCardProps {
  player: { name: string; avatarId: string };
  /** 按钮文案，如「是我，看词 🙈」「是我，投票 🤫」 */
  actionLabel: string;
  onAction: () => void;
  /** 按钮下方辅助小字 */
  subNote?: ReactNode;
}

/** 交接卡（DP2）：所有传机时刻统一「给谁 + 是我确认」；卡上永不出现词语 */
export function HandoffCard({ player, actionLabel, onAction, subNote }: HandoffCardProps) {
  return (
    <div className="handoff">
      <div className="handoff__fly" aria-hidden="true">
        <span>📱</span>
        <span className="handoff__fly-arrow">➜</span>
      </div>
      <div className="handoff__avatar-ring">
        <Avatar avatarId={player.avatarId} size="xxl" />
      </div>
      <div className="handoff__lead">下一个是</div>
      <div className="handoff__name">{player.name}</div>
      <ActionButton variant="primary" tall onClick={onAction}>
        {actionLabel}
      </ActionButton>
      {subNote != null && <div className="handoff__sub">{subNote}</div>}
    </div>
  );
}
