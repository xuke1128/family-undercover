import { ActionButton } from '../ui/Button';

interface HowToPlaySheetProps {
  onClose: () => void;
}

/** 「怎么玩」静态图文弹层（02-design §4 P1）：3 步玩法 + 规则要点，纯静态无状态 */
export function HowToPlaySheet({ onClose }: HowToPlaySheetProps) {
  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="怎么玩" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grabber" aria-hidden="true" />
        <div className="sheet__head">
          <div className="sheet__title">怎么玩</div>
        </div>
        <div className="howto">
          <div className="howto__step">
            <span className="howto__no">1</span>
            <div className="howto__text">
              手机轮流传，每人点「是我，看词」看自己的词，看完点「记住啦，隐藏」再传给下一位。
            </div>
          </div>
          <div className="howto__step">
            <span className="howto__no">2</span>
            <div className="howto__text">按顺序每人用一句话描述自己的词，不能说出词、不能说字。</div>
          </div>
          <div className="howto__step">
            <span className="howto__no">3</span>
            <div className="howto__text">全员描述完，再传机轮流投票，得票最多的人出局亮身份。</div>
          </div>
          <div className="howto__rules">
            平民都拿到同一个词，卧底拿到相近的另一个词，卧底自己也不知道是不是卧底。
            <br />
            卧底全被投出局，平民赢；卧底人数追平平民，卧底赢。
            <br />
            打开就是简单模式（3-6 人，儿童词库），家庭聚会可在开局前切换普通模式（3-12 人）。
          </div>
        </div>
        <ActionButton variant="primary" onClick={onClose}>
          知道啦
        </ActionButton>
      </div>
    </div>
  );
}
