import { ActionButton } from '../ui/Button';

interface HomeViewProps {
  onStart: () => void;
  onLeaderboard: () => void;
  onHowToPlay: () => void;
}

/** P1 首页：品牌 + 三入口；默认简单模式徽标（US1：≤2 步进设置） */
export function HomeView({ onStart, onLeaderboard, onHowToPlay }: HomeViewProps) {
  return (
    <div className="home">
      <div className="home__logo" aria-hidden="true">
        🎉
      </div>
      <h1 className="home__title">家庭卧底派对</h1>
      <p className="home__tagline">一台手机，全家开演 🎭</p>
      <div className="home__actions">
        <ActionButton variant="primary" onClick={onStart}>
          ▶ 开始游戏
        </ActionButton>
        <ActionButton variant="secondary" onClick={onLeaderboard}>
          🏆 家庭排行榜
        </ActionButton>
        <button type="button" className="btn-text-link" onClick={onHowToPlay}>
          ❓ 怎么玩
        </button>
      </div>
      <div className="home__badge">🍬 默认简单模式 · 适合全家</div>
    </div>
  );
}
