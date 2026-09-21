import { Avatar } from './Avatar';

export interface ProgressItem {
  id: string;
  name: string;
  avatarId: string;
}

interface ProgressAvatarsProps {
  items: readonly ProgressItem[];
  currentIndex: number;
  /** 进度标签，如「看词 2/5」 */
  label: string;
}

/** 头像进度序列：已完成打 ✓、当前放大高亮、未到弱化；出局者由调用方过滤或灰显 */
export function ProgressAvatars({ items, currentIndex, label }: ProgressAvatarsProps) {
  return (
    <div className="progress-row" aria-label={label}>
      {items.map((p, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
        return (
          <span key={p.id} className={`progress-item progress-item--${state}`}>
            <Avatar avatarId={p.avatarId} size={state === 'current' ? 'md' : 'sm'} />
            {state === 'done' && (
              <span className="progress-item__check" aria-hidden="true">
                ✓
              </span>
            )}
          </span>
        );
      })}
      <span className="progress-row__label">{label}</span>
    </div>
  );
}
