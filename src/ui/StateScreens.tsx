import type { ReactNode } from 'react';
import { ActionButton } from './Button';

interface StateScreenProps {
  emoji: string;
  title: string;
  sub?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** 空态 / 全屏错误态（E1）：emoji + 一句话 + 一个行动出口，保证无死路 */
export function StateScreen({ emoji, title, sub, actionLabel, onAction }: StateScreenProps) {
  return (
    <div className="state-screen">
      <div className="state-screen__emoji" aria-hidden="true">
        {emoji}
      </div>
      <div className="state-screen__title">{title}</div>
      {sub != null && <div className="state-screen__sub">{sub}</div>}
      {actionLabel && onAction && (
        <ActionButton variant="primary" onClick={onAction}>
          {actionLabel}
        </ActionButton>
      )}
    </div>
  );
}
