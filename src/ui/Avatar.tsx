import { getAvatar } from '../avatars/catalog';
import { CustomAvatarArt } from '../avatars/CustomAvatars';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface AvatarProps {
  avatarId: string;
  size?: AvatarSize;
  /** 出局/不可选：灰度弱化（不依赖颜色单一传达，另配文字章） */
  dimmed?: boolean;
  className?: string;
}

/** 统一头像渲染：原创 SVG 或 emoji + 固定浅色圆底 */
export function Avatar({ avatarId, size = 'md', dimmed = false, className = '' }: AvatarProps) {
  const def = getAvatar(avatarId);
  const cls = `avatar avatar--${size} ${dimmed ? 'avatar--out' : ''} ${className}`.trim();
  return (
    <span className={cls} style={{ background: def.bg }} aria-hidden="true">
      {def.kind === 'emoji' ? (
        <span className="avatar__emoji">{def.face}</span>
      ) : (
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          <CustomAvatarArt avatarKey={def.id.replace('custom:', '')} />
        </svg>
      )}
    </span>
  );
}
