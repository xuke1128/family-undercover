/**
 * 4 个原创定制头像（40×40 viewBox 矢量插画）。
 * 图形取自本项目 docs/mockups/p02-setup.svg / s01-avatar-picker.svg 的原创绘制，
 * 无任何版权角色形象与商标名（PRD §9-11）。
 */

export type CustomAvatarKey = 'nuandad' | 'tianma' | 'pixelkid' | 'pinkbunny';

/** 暖爸：短发 + 眼镜 + 衬衫的中年爸爸萌系形象 */
export function NuandadAvatar(): React.JSX.Element {
  return (
    <g>
      <circle cx="20" cy="19" r="13.5" fill="#5A4632" />
      <circle cx="8.5" cy="24" r="2.2" fill="#F6CFA4" />
      <circle cx="31.5" cy="24" r="2.2" fill="#F6CFA4" />
      <circle cx="20" cy="23" r="11" fill="#F6CFA4" />
      <path d="M9.5,19 q10.5,-13 21,0 q-4,-6 -10.5,-6 q-6.5,0 -10.5,6 Z" fill="#5A4632" />
      <circle cx="15" cy="22" r="3.6" fill="none" stroke="#46372E" strokeWidth="1.5" />
      <circle cx="25" cy="22" r="3.6" fill="none" stroke="#46372E" strokeWidth="1.5" />
      <line x1="18.6" y1="22" x2="21.4" y2="22" stroke="#46372E" strokeWidth="1.5" />
      <path d="M13.7,22 q1.3,1.5 2.6,0" fill="none" stroke="#46372E" strokeWidth="1.2" />
      <path d="M23.7,22 q1.3,1.5 2.6,0" fill="none" stroke="#46372E" strokeWidth="1.2" />
      <path d="M19,25.8 q1,1 2,0" fill="none" stroke="#D8A878" strokeWidth="1.2" />
      <circle cx="12.5" cy="26.5" r="1.5" fill="#F5B48F" />
      <circle cx="27.5" cy="26.5" r="1.5" fill="#F5B48F" />
      <path d="M16.5,29 q3.5,2.4 7,0" fill="none" stroke="#A66A4A" strokeWidth="1.4" />
      <rect x="9" y="33.5" width="22" height="6.5" rx="2.5" fill="#5B7A99" />
      <path d="M15,33.5 l5,4.2 5,-4.2 Z" fill="#4A6B8A" />
    </g>
  );
}

/** 甜妈：齐肩发 + 温柔笑眼 + 针织衫的妈妈萌系形象 */
export function TianmaAvatar(): React.JSX.Element {
  return (
    <g>
      <rect x="6.5" y="11" width="27" height="24" rx="10" fill="#8A5A3B" />
      <circle cx="20" cy="22.5" r="11" fill="#F9D8B4" />
      <path d="M9,19.5 q11,-12 22,0 q-3.5,-6.5 -11,-6.5 q-7.5,0 -11,6.5 Z" fill="#8A5A3B" />
      <circle cx="11" cy="15.5" r="1.8" fill="#FFC94D" />
      <circle cx="11" cy="15.5" r="0.7" fill="#F0633F" />
      <path d="M13.5,22.5 q1.6,1.8 3.2,0" fill="none" stroke="#46372E" strokeWidth="1.3" />
      <path d="M23.3,22.5 q1.6,1.8 3.2,0" fill="none" stroke="#46372E" strokeWidth="1.3" />
      <circle cx="12.8" cy="26" r="1.7" fill="#F7B8A0" />
      <circle cx="27.2" cy="26" r="1.7" fill="#F7B8A0" />
      <path d="M17,28.6 q3,2.2 6,0" fill="none" stroke="#C96A5A" strokeWidth="1.4" />
      <rect x="9" y="33.5" width="22" height="6.5" rx="3" fill="#F09A7B" />
      <path d="M16,33.8 l4,3.6 4,-3.6" fill="none" stroke="#E3815F" strokeWidth="1.3" />
    </g>
  );
}

/** 像素小子：棕发蓝衣的方块小人（像素块质感） */
export function PixelkidAvatar(): React.JSX.Element {
  return (
    <g>
      <rect x="8" y="4" width="24" height="8" fill="#6B4A2F" />
      <rect x="8" y="12" width="4" height="4" fill="#6B4A2F" />
      <rect x="28" y="12" width="4" height="4" fill="#6B4A2F" />
      <rect x="12" y="12" width="16" height="12" fill="#F2C79F" />
      <rect x="14" y="15" width="4" height="4" fill="#FFFFFF" />
      <rect x="15" y="16" width="2" height="2" fill="#4A6FA5" />
      <rect x="22" y="15" width="4" height="4" fill="#FFFFFF" />
      <rect x="23" y="16" width="2" height="2" fill="#4A6FA5" />
      <rect x="19" y="18" width="2" height="3" fill="#E0A87E" />
      <rect x="17" y="22" width="6" height="2" fill="#A66A4A" />
      <rect x="10" y="24" width="20" height="13" fill="#4FA3E3" />
      <rect x="16" y="24" width="8" height="3" fill="#3E86C9" />
      <rect x="14" y="29" width="4" height="4" fill="#3E86C9" />
      <rect x="24" y="31" width="4" height="4" fill="#3E86C9" />
      <rect x="6" y="26" width="4" height="9" fill="#4FA3E3" />
      <rect x="30" y="26" width="4" height="9" fill="#4FA3E3" />
      <rect x="6" y="35" width="4" height="3" fill="#F2C79F" />
      <rect x="30" y="35" width="4" height="3" fill="#F2C79F" />
    </g>
  );
}

/** 粉兜兔：粉帽小白兔（粉兜帽 + 兔耳 + 蝴蝶结） */
export function PinkbunnyAvatar(): React.JSX.Element {
  return (
    <g>
      <rect x="9" y="0" width="8" height="19" rx="4" fill="#FF9EBB" />
      <rect x="11" y="2.5" width="4" height="13" rx="2" fill="#FFD3E2" />
      <rect x="23" y="0" width="8" height="19" rx="4" fill="#FF9EBB" />
      <rect x="25" y="2.5" width="4" height="13" rx="2" fill="#FFD3E2" />
      <circle cx="20" cy="27" r="13" fill="#FFB6CD" />
      <path d="M9,23 Q20,17 31,23 Q20,20.5 9,23" fill="#FF8FB3" />
      <ellipse cx="20" cy="30" rx="9.5" ry="8.5" fill="#FFFFFF" />
      <circle cx="16" cy="28" r="1.8" fill="#46372E" />
      <circle cx="24" cy="28" r="1.8" fill="#46372E" />
      <ellipse cx="20" cy="31.5" rx="2" ry="1.4" fill="#F0633F" />
      <circle cx="13.5" cy="31.5" r="1.4" fill="#FFC9D8" />
      <circle cx="26.5" cy="31.5" r="1.4" fill="#FFC9D8" />
      <circle cx="28.5" cy="19.5" r="2.4" fill="#FFC94D" />
      <circle cx="28.5" cy="19.5" r="0.9" fill="#F0633F" />
    </g>
  );
}

const CUSTOM_ART: Record<CustomAvatarKey, () => React.JSX.Element> = {
  nuandad: NuandadAvatar,
  tianma: TianmaAvatar,
  pixelkid: PixelkidAvatar,
  pinkbunny: PinkbunnyAvatar,
};

export function CustomAvatarArt({ avatarKey }: { avatarKey: string }): React.JSX.Element | null {
  const Art = CUSTOM_ART[avatarKey as CustomAvatarKey];
  return Art ? <Art /> : null;
}
