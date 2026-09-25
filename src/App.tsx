import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { GameMode, Player } from './game/types';
import { gameReducer } from './game/machine';
import { dealGame } from './game/dealer';
import { mathRandom } from './game/rng';
import { AppStoreRepo, type AppStore } from './storage/appStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Toast } from './ui/Toast';
import { HomeView } from './views/HomeView';
import { SetupView } from './views/SetupView';
import { GameView } from './views/GameView';
import { LeaderboardView } from './views/LeaderboardView';
import { HowToPlaySheet } from './views/HowToPlaySheet';

type Screen =
  | { name: 'home' }
  | { name: 'setup'; roster?: Player[]; mode?: GameMode }
  | { name: 'game' }
  | { name: 'leaderboard' };

const SPLASH_MS = 700;
const NEXT_GAME_TRANSITION_MS = 1000;

function AppInner() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [game, dispatch] = useReducer(gameReducer, null);
  const [toast, setToast] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [redealTransition, setRedealTransition] = useState(false);

  const repo = useMemo(() => new AppStoreRepo(), []);
  const [store, setStore] = useState<AppStore>(() => repo.load());
  const storeRef = useRef(store);
  storeRef.current = store;

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  // Toast 2s 自动消失
  useEffect(() => {
    if (toast == null) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // P0 首开加载态（≤1s）→ 首页
  useEffect(() => {
    const t = window.setTimeout(() => setSplashGone(true), SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  /** 发词：随机避开近期用过的词对（IO 只在 App 层发生，reducer 保持纯函数） */
  const makeAssignment = useCallback(
    (roster: Player[], mode: GameMode) =>
      dealGame(roster, { mode, recentPairIds: storeRef.current.recentPairs, rng: mathRandom }),
    [],
  );

  const persist = useCallback(
    (next: AppStore) => {
      setStore(next);
      if (!repo.save(next)) showToast('战绩保存失败（本机存储不可用）');
    },
    [repo, showToast],
  );

  // 发词副作用：记录近期词对（按 gameSeq 去重）
  const recordedSeq = useRef(-1);
  useEffect(() => {
    if (!game) return;
    if (recordedSeq.current === game.gameSeq) return;
    recordedSeq.current = game.gameSeq;
    persist(repo.recordRecentPair(storeRef.current, game.assignment.pair.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.gameSeq]);

  // 结算副作用：按 §3.5 计分入档（获胜阵营含已出局成员 +1 胜）
  const scoredSeq = useRef(-1);
  useEffect(() => {
    if (!game || game.phase.kind !== 'final' || !game.winner) return;
    if (scoredSeq.current === game.gameSeq) return;
    scoredSeq.current = game.gameSeq;
    persist(repo.recordGameResult(storeRef.current, game.roster, game.assignment.roles, game.winner));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase.kind, game?.gameSeq]);

  const startGame = useCallback(
    (roster: Player[], mode: GameMode) => {
      const assignment = makeAssignment(roster, mode);
      dispatch({ type: 'START_GAME', roster, mode, assignment, rng: mathRandom });
      setScreen({ name: 'game' });
    },
    [makeAssignment],
  );

  const redeal = useCallback(
    (withTransition: boolean) => {
      if (!game) return;
      const doRedeal = () => {
        const assignment = makeAssignment(game.roster, game.mode);
        dispatch({ type: 'REDEAL', assignment, rng: mathRandom });
      };
      if (withTransition) {
        setRedealTransition(true);
        window.setTimeout(() => {
          doRedeal();
          setRedealTransition(false);
        }, NEXT_GAME_TRANSITION_MS);
      } else {
        doRedeal();
      }
    },
    [game, makeAssignment],
  );

  const clearStats = useCallback(() => {
    persist(repo.clear());
    showToast('已清空');
  }, [persist, repo, showToast]);

  const resetToHome = useCallback(() => {
    setScreen({ name: 'home' });
    setToast(null);
    setShowHowTo(false);
    setRedealTransition(false);
  }, []);

  return (
    <ErrorBoundary onReset={resetToHome}>
      <div className="app-shell">
        <main className="app-main">
          {screen.name === 'home' && (
            <HomeView
              onStart={() => setScreen({ name: 'setup' })}
              onLeaderboard={() => setScreen({ name: 'leaderboard' })}
              onHowToPlay={() => setShowHowTo(true)}
            />
          )}

          {screen.name === 'setup' && (
            <SetupView
              initialRoster={screen.roster}
              initialMode={screen.mode}
              onBack={() => setScreen({ name: 'home' })}
              onStart={startGame}
              showToast={showToast}
            />
          )}

          {screen.name === 'game' && game && (
            <GameView
              state={game}
              dispatch={dispatch}
              onRestart={() => redeal(false)}
              onNextGame={() => redeal(true)}
              onEditRoster={() => setScreen({ name: 'setup', roster: game.roster, mode: game.mode })}
              onLeaderboard={() => setScreen({ name: 'leaderboard' })}
              onHome={() => setScreen({ name: 'home' })}
            />
          )}
          {screen.name === 'game' && !game && (
            <div className="state-screen">
              <div className="state-screen__emoji" aria-hidden="true">
                🎭
              </div>
              <div className="state-screen__title">本局已结束</div>
              <button type="button" className="btn btn--primary" onClick={() => setScreen({ name: 'home' })}>
                回首页
              </button>
            </div>
          )}

          {screen.name === 'leaderboard' && (
            <LeaderboardView
              store={store}
              onBack={() => setScreen({ name: 'home' })}
              onStartGame={() => setScreen({ name: 'setup' })}
              onClear={clearStats}
            />
          )}
        </main>

        {showHowTo && <HowToPlaySheet onClose={() => setShowHowTo(false)} />}
        {toast != null && <Toast message={toast} />}
        {redealTransition && (
          <div className="transition-screen" role="status">
            <div className="transition-screen__emoji" aria-hidden="true">
              🎴
            </div>
            <div className="transition-screen__text">换新词啦</div>
          </div>
        )}
        {!splashGone && (
          <div className="splash" aria-hidden="true">
            <div className="splash__logo">
              🎉
            </div>
            <div className="splash__title">家庭卧底派对</div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  // 局状态不持久化：刷新/关闭即作废回首页（PRD §8）。此处仅挂载内层
  return <AppInner />;
}
