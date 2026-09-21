/** T1 Toast：底部轻提示，2s 自动消失，不遮挡主按钮 */

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
