/** 领域类型：全部玩法实体的定义。纯类型，无运行时依赖。 */

export type GameMode = 'simple' | 'normal';
export type Role = 'civilian' | 'undercover';
export type Camp = Role;
export type Difficulty = 'easy' | 'normal';
export type Category = 'animal' | 'food' | 'object' | 'character' | 'place';

export interface Player {
  id: string;
  name: string;
  avatarId: string;
}

export interface WordPair {
  id: string;
  category: Category;
  difficulty: Difficulty;
  /** 平民词（多数人拿到） */
  civilian: string;
  /** 卧底词（与平民词相近但不同） */
  undercover: string;
}

export interface Vote {
  voterId: string;
  targetId: string;
}

export interface Assignment {
  pair: WordPair;
  /** playerId -> 角色。卧底由系统随机分配，任何界面前不可见（终局/出局揭晓除外）。 */
  roles: Record<string, Role>;
}

export type Phase =
  /** P4 态 A（revealed=false 交接确认）/ 态 B（revealed=true 显词） */
  | { kind: 'peek'; index: number; revealed: boolean }
  /** P4 态 C：全员看完 */
  | { kind: 'peekDone' }
  /** P5 描述轮；tiebreak=true 即 P9 平票加赛形态（仅平票者描述） */
  | { kind: 'describe'; index: number; tiebreak: boolean }
  /** P6 投票；confirmed=false 交接确认，true 选票中；tiebreak=true 为平票重投 */
  | { kind: 'vote'; index: number; confirmed: boolean; tiebreak: boolean }
  /** P7 票型公示 */
  | { kind: 'voteResult'; tiebreak: boolean }
  /** P9 第一屏：平票，准备加赛 */
  | { kind: 'tieAnnounce' }
  /** P9 第二屏：重投仍平票，本轮无人出局 */
  | { kind: 'tieStuck' }
  /** P8 出局揭晓两段式；flipped=false 先亮人，true 已翻身份 */
  | { kind: 'reveal'; eliminatedId: string; flipped: boolean }
  /** P10 终局结算 */
  | { kind: 'final' };

export interface GameState {
  mode: GameMode;
  roster: Player[];
  assignment: Assignment;
  phase: Phase;
  roundNo: number;
  /** 当前投票轮（含平票重投）的选票，按投票顺序 */
  votes: Vote[];
  /** 已出局玩家 id，按出局顺序 */
  eliminatedIds: string[];
  /** 平票者 id（座位顺序），供加赛描述/重投使用 */
  tiebreakIds: string[];
  /** 连续无人出局的轮数；≥3 触发 M2 兜底弹层 */
  noExitStreak: number;
  showFallback: boolean;
  winner: Camp | null;
  /** 发词批次号：每次新发词 +1，供副作用（计分入档/记录词对）去重 */
  gameSeq: number;
}
