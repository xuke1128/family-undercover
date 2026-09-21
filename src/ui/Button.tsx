import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'plain';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** 传机主按钮：高 ≥64px */
  tall?: boolean;
  /** 置灰时的副文案（如「还差 X 名玩家」） */
  hint?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  danger: 'btn--danger',
  plain: 'btn--plain',
};

/** 每屏唯一主行动按钮（DP1）：底部固定、全胶囊、大触控目标 */
export function ActionButton({
  variant = 'primary',
  tall = false,
  hint,
  className = '',
  children,
  ...rest
}: PrimaryButtonProps) {
  const cls = `btn ${variantClass[variant]} ${tall ? 'btn--tall' : ''} ${className}`.trim();
  return (
    <>
      <button type="button" className={cls} {...rest}>
        {children}
      </button>
      {hint != null && <span className="btn__hint">{hint}</span>}
    </>
  );
}
