import type { ReactNode } from 'react';

interface ModalProps {
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
}

/** M1/M2 二次确认与兜底弹层：居中卡 + 遮罩 */
export function Modal({ title, body, children, onClose }: ModalProps) {
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : '确认操作'}
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        {body != null && <div className="modal__body">{body}</div>}
        {children}
      </div>
    </div>
  );
}
