import { useState } from 'react';
import type { GameMode, Player } from '../game/types';
import {
  NAME_MAX_CHARS,
  capFor,
  canSwitchMode,
  checkAddPlayer,
  defaultRoster,
  nextPlayerId,
  randomizeAllAvatars,
  randomUnoccupiedAvatarId,
  validateRoster,
} from '../game/setup';
import { mathRandom } from '../game/rng';
import { Avatar } from '../ui/Avatar';
import { ActionButton } from '../ui/Button';
import { AvatarPickerSheet } from './AvatarPickerSheet';

type BannerKind = 'simple-full' | 'block-switch-simple';

interface SetupViewProps {
  /** 修改名单带出的名单/模式（F8-4）；缺省为默认预填 4 家人 + 简单模式 */
  initialRoster?: Player[];
  initialMode?: GameMode;
  onBack: () => void;
  onStart: (roster: Player[], mode: GameMode) => void;
  showToast: (msg: string) => void;
}

/** P2 局前设置：模式选择（默认简单）+ 预填名单管理 + 全部人数边界（US2/US9） */
export function SetupView({ initialRoster, initialMode = 'simple', onBack, onStart, showToast }: SetupViewProps) {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [players, setPlayers] = useState<Player[]>(() => initialRoster ?? defaultRoster());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatarId, setNewAvatarId] = useState('');
  const [banner, setBanner] = useState<BannerKind | null>(null);
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  const occupiedByOthers = (selfId: string) => players.filter((p) => p.id !== selfId).map((p) => p.avatarId);
  const validation = validateRoster(mode, players);
  const addCheck = checkAddPlayer(mode, players.length);

  const startAdd = () => {
    if (!addCheck.ok) {
      // 简单模式满员：不进入添加态，升起驻留横幅（含一键切普通）
      setBanner(addCheck.reason === 'simple-full' ? 'simple-full' : null);
      return;
    }
    setAdding(true);
    setNewName('');
    setNewAvatarId(randomUnoccupiedAvatarId(mathRandom, players.map((p) => p.avatarId)));
  };

  const switchMode = (target: GameMode) => {
    if (!canSwitchMode(target, players.length)) {
      // 普通 >6 人切回简单：阻止并提示先删减（无切换按钮）
      setBanner('block-switch-simple');
      return;
    }
    setMode(target);
    setBanner(null);
    showToast(target === 'simple' ? '已切换到简单模式' : '已切换到普通模式');
  };

  const saveNewPlayer = () => {
    const name = newName.trim();
    if (name.length === 0 || name.length > NAME_MAX_CHARS) return;
    if (players.some((p) => p.name === name)) return;
    setPlayers((prev) => [...prev, { id: nextPlayerId(), name, avatarId: newAvatarId }]);
    setAdding(false);
  };

  const removePlayer = (p: Player) => {
    setPlayers((prev) => prev.filter((x) => x.id !== p.id));
    if (renamingId === p.id) setRenamingId(null);
    showToast(`已删除 ${p.name}`);
    // 删到 6 人以内后，切回简单的阻碍自然解除（横幅随状态消失）
    if (banner === 'block-switch-simple' && players.length - 1 <= 6) setBanner(null);
  };

  const beginRename = (p: Player) => {
    setRenamingId(p.id);
    setRenameDraft(p.name);
    setRenameError('');
  };

  const commitRename = () => {
    if (!renamingId) return;
    const name = renameDraft.trim();
    const dup = players.some((p) => p.id !== renamingId && p.name === name);
    if (name.length === 0) {
      setRenameError('先写名字哦');
      return;
    }
    if (name.length > NAME_MAX_CHARS) {
      setRenameError(`最多 ${NAME_MAX_CHARS} 个字`);
      return;
    }
    if (dup) {
      setRenameError('名字重复啦');
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === renamingId ? { ...p, name } : p)));
    setRenamingId(null);
  };

  const randomizeAll = () => {
    setPlayers((prev) => randomizeAllAvatars(mathRandom, prev));
    showToast('头像已随机');
  };

  const modeNote =
    mode === 'simple' ? '简单：3-6 人 · 儿童词库 · 有句式提示' : '普通：3-12 人 · 全词库 · 经典规则';

  const newPlayerInvalid =
    newName.trim().length === 0 ||
    newName.trim().length > NAME_MAX_CHARS ||
    players.some((p) => p.name === newName.trim());

  return (
    <>
      <div className="topbar">
        <button type="button" className="topbar__back" aria-label="回首页" onClick={onBack}>
          ‹
        </button>
        <div className="topbar__title">开局设置</div>
      </div>

      <div className="segmented" role="radiogroup" aria-label="模式选择">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'simple'}
          className={`segmented__item ${mode === 'simple' ? 'segmented__item--active' : ''}`}
          onClick={() => switchMode('simple')}
        >
          🍬 简单模式
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'normal'}
          className={`segmented__item ${mode === 'normal' ? 'segmented__item--active' : ''}`}
          onClick={() => switchMode('normal')}
        >
          🎭 普通
        </button>
      </div>
      <p className="mode-note">{modeNote}</p>

      <div className="setup__bar">
        <span className="setup__count">
          玩家 {players.length}/{capFor(mode)}
        </span>
        <button
          type="button"
          className="setup__random-all"
          onClick={randomizeAll}
          disabled={players.length === 0}
        >
          🎲 随机头像
        </button>
      </div>

      <div className="card player-list" aria-label="玩家名单">
        {players.map((p) =>
      renamingId === p.id ? (
          <div className="player-row" key={p.id}>
            <Avatar avatarId={p.avatarId} size="md" />
            <div className="player-row__name" style={{ display: 'block' }}>
              <input
                className="name-input"
                value={renameDraft}
                maxLength={NAME_MAX_CHARS}
                autoFocus
                aria-label={`${p.name} 改名`}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                }}
              />
              <span className="name-input__hint">{renameError}</span>
            </div>
            <button
              type="button"
              className="player-row__remove"
              aria-label="取消改名"
              onClick={() => setRenamingId(null)}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="player-row" key={p.id}>
            <button
              type="button"
              className="player-row__avatar-btn"
              aria-label={`换 ${p.name} 的头像`}
              onClick={() => setPickingFor(p.id)}
            >
              <Avatar avatarId={p.avatarId} size="md" />
            </button>
            <button type="button" className="player-row__name" onClick={() => beginRename(p)}>
              {p.name}
            </button>
            <button
              type="button"
              className="player-row__remove"
              aria-label={`删除 ${p.name}`}
              onClick={() => removePlayer(p)}
            >
              ✕
            </button>
          </div>
        ),
        )}

        {adding && (
          <div className="new-player-card">
            <button
              type="button"
              className="player-row__avatar-btn"
              aria-label="换新玩家头像"
              onClick={() => setPickingFor('new')}
            >
              <Avatar avatarId={newAvatarId} size="md" />
            </button>
            <div className="new-player-card__input">
              <input
                className="name-input"
                placeholder="写个名字吧"
                value={newName}
                maxLength={NAME_MAX_CHARS}
                autoFocus
                aria-label="新玩家昵称"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNewPlayer();
                }}
              />
              <span className="name-input__hint">
                {newName.trim().length === 0
                  ? '先写名字哦'
                  : newName.trim().length > NAME_MAX_CHARS
                    ? `最多 ${NAME_MAX_CHARS} 个字`
                    : players.some((p) => p.name === newName.trim())
                      ? '名字重复啦'
                      : ''}
              </span>
            </div>
            <button
              type="button"
              className="new-player-card__save"
              disabled={newPlayerInvalid}
              onClick={saveNewPlayer}
            >
              保存
            </button>
          </div>
        )}
      </div>

      {!adding && (
        <button
          type="button"
          className="add-player-btn"
          onClick={startAdd}
          disabled={addCheck.ok === false && addCheck.reason === 'normal-full'}
        >
          {addCheck.ok === false && addCheck.reason === 'normal-full' ? '最多 12 人' : '＋ 添加玩家'}
        </button>
      )}

      <p className="setup__prefill-note">
        {initialRoster ? '沿用本局名单 · 可改名、增删（至少 3 人）' : '已预填 4 位家人 · 可改名、增删（至少 3 人）'}
      </p>

      {banner === 'simple-full' && (
        <div className="banner" role="alert">
          <span className="banner__icon" aria-hidden="true">
            ⚠️
          </span>
          <div className="banner__text">简单模式最多 6 人</div>
          <div className="banner__actions">
            <ActionButton variant="primary" onClick={() => switchMode('normal')}>
              切换到普通模式
            </ActionButton>
            <ActionButton variant="plain" onClick={() => setBanner(null)}>
              知道了
            </ActionButton>
          </div>
        </div>
      )}
      {banner === 'block-switch-simple' && (
        <div className="banner" role="alert">
          <span className="banner__icon" aria-hidden="true">
            ⚠️
          </span>
          <div className="banner__text">简单模式最多 6 人，请先删减玩家</div>
          <div className="banner__actions">
            <ActionButton variant="plain" onClick={() => setBanner(null)}>
              知道了
            </ActionButton>
          </div>
        </div>
      )}

      <div className="footer-actions">
        <ActionButton
          variant="primary"
          disabled={!validation.ok}
          hint={
            !validation.ok && validation.issue?.code === 'too-few'
              ? `还差 ${validation.issue.missing} 名玩家（至少 3 人）`
              : undefined
          }
          onClick={() => validation.ok && onStart(players, mode)}
        >
          开始游戏
        </ActionButton>
      </div>

      {pickingFor && (
        <AvatarPickerSheet
          occupied={pickingFor === 'new' ? players.map((p) => p.avatarId) : occupiedByOthers(pickingFor)}
          onSelect={(avatarId) => {
            if (pickingFor === 'new') {
              setNewAvatarId(avatarId);
            } else {
              setPlayers((prev) => prev.map((p) => (p.id === pickingFor ? { ...p, avatarId } : p)));
            }
            setPickingFor(null);
          }}
          onClose={() => setPickingFor(null)}
        />
      )}
    </>
  );
}
