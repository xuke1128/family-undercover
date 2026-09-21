import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import {
  CUSTOM_AVATARS,
  EMOJI_GROUP_LABELS,
  EMOJI_GROUPS,
  emojiAvatarsOfGroup,
} from '../avatars/catalog';
import { randomUnoccupiedAvatarId } from '../game/setup';
import { mathRandom } from '../game/rng';

interface AvatarPickerSheetProps {
  /** 当前已被其他玩家占用的头像 id */
  occupied: readonly string[];
  onSelect: (avatarId: string) => void;
  onClose: () => void;
}

/** S1 头像选择弹层：4 个原创置顶 + 5 分组 emoji；已选置灰✓；🎲 随机 */
export function AvatarPickerSheet({ occupied, onSelect, onClose }: AvatarPickerSheetProps) {
  const [group, setGroup] = useState<(typeof EMOJI_GROUPS)[number]>('animal');
  const occupiedSet = new Set(occupied);

  const handleRandom = () => {
    const id = randomUnoccupiedAvatarId(mathRandom, occupied);
    onSelect(id);
  };

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="选一个头像" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grabber" aria-hidden="true" />
        <div className="sheet__head">
          <div className="sheet__title">选一个头像</div>
          <button type="button" className="sheet__random" onClick={handleRandom}>
            🎲 随机
          </button>
        </div>

        <div className="sheet__section-label">
          <span>✨ 原创头像</span>
          <small>共 {CUSTOM_AVATARS.length} 个</small>
        </div>
        <div className="custom-grid">
          {CUSTOM_AVATARS.map((a) => {
            const taken = occupiedSet.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={`custom-avatar-cell ${taken ? 'custom-avatar-cell--taken' : ''}`}
                disabled={taken}
                aria-label={taken ? `${a.name}（已被选）` : a.name}
                onClick={() => onSelect(a.id)}
              >
                <span className="custom-avatar-cell__tag" aria-hidden="true">
                  ✦
                </span>
                {taken && (
                  <span className="custom-avatar-cell__check" aria-hidden="true">
                    ✓
                  </span>
                )}
                <Avatar avatarId={a.id} size="lg" />
                <span className="custom-avatar-cell__name">{a.name}</span>
              </button>
            );
          })}
        </div>

        <div className="sheet__section-label">
          <span>emoji 头像</span>
          <small>共 50 个</small>
        </div>
        <div className="chip-row" role="tablist" aria-label="emoji 分组">
          {EMOJI_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              className={`chip ${group === g ? 'chip--active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {EMOJI_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
        <div className="emoji-grid">
          {emojiAvatarsOfGroup(group).map((a) => {
            const taken = occupiedSet.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={`emoji-cell ${taken ? 'emoji-cell--taken' : ''}`}
                style={{ background: a.bg }}
                disabled={taken}
                aria-label={taken ? `${a.face}（已被选）` : `头像 ${a.face}`}
                onClick={() => onSelect(a.id)}
              >
                <span className="avatar__emoji">{a.face}</span>
                {taken && (
                  <span className="emoji-cell__check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
