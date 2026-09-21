import { useState } from 'react';
import type { AppStore } from '../storage/appStore';
import { leaderboardRows } from '../storage/appStore';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StateScreen } from '../ui/StateScreens';

interface LeaderboardViewProps {
  store: AppStore;
  onBack: () => void;
  onStartGame: () => void;
  onClear: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** P11 战绩排行榜（US8）：胜场降序、同胜场看胜率；清空需二次确认 */
export function LeaderboardView({ store, onBack, onStartGame, onClear }: LeaderboardViewProps) {
  const [confirming, setConfirming] = useState(false);
  const rows = leaderboardRows(store);

  return (
    <>
      <div className="topbar">
        <button type="button" className="topbar__back" aria-label="返回" onClick={onBack}>
          ‹
        </button>
        <div className="topbar__title">家庭排行榜</div>
      </div>
      <p className="mode-note">按胜场排序，同胜场看胜率</p>

      {rows.length === 0 ? (
        <StateScreen
          emoji="🏆"
          title="还没有战绩"
          sub="快开一局，看看谁是卧底！"
          actionLabel="开始游戏"
          onAction={onStartGame}
        />
      ) : (
        <div className="card rank-list" aria-label="排行榜">
          {rows.map((row, i) => (
            <div className="rank-row" key={row.key}>
              <span className={`rank-row__no ${i < 3 ? '' : 'rank-row__no--plain'}`} aria-label={`第 ${i + 1} 名`}>
                {i < 3 ? MEDALS[i] : i + 1}
              </span>
              <Avatar avatarId={row.profile.avatarId} size="md" />
              <span className="rank-row__name">{row.profile.name}</span>
              <span className="rank-row__stats">
                {row.profile.wins} 胜 / {row.profile.games} 局
              </span>
              <span className="rank-row__rate">{Math.round(row.winRate * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <button type="button" className="btn-text-link" style={{ alignSelf: 'center' }} onClick={() => setConfirming(true)}>
            🗑️ 清空战绩
          </button>
          <p className="leaderboard__note">战绩只存在这台手机上</p>
        </>
      )}

      {confirming && (
        <Modal
          title="确定清空所有战绩？"
          body="清空后找不回来哦"
          onClose={() => setConfirming(false)}
        >
          <div className="modal__actions">
            <ActionButton variant="danger" onClick={onClear}>
              清空
            </ActionButton>
            <ActionButton variant="plain" onClick={() => setConfirming(false)}>
              取消
            </ActionButton>
          </div>
        </Modal>
      )}
    </>
  );
}
