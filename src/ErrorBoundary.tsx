import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** E1 出口：回首页（重置应用状态）。重置后仍持续出错时提供刷新 */
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** E1 全屏错误态兜底：任何未知渲染异常都有「回首页」出口，保证无死路（02-design F10） */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // 不吞异常：留痕便于排查（发布环境可接入日志）
    console.error('[家庭卧底派对] 界面异常：', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="state-screen">
            <div className="state-screen__emoji" aria-hidden="true">
              😢
            </div>
            <div className="state-screen__title">哎呀，出错了</div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                this.props.onReset();
                this.setState({ hasError: false });
              }}
            >
              回首页
            </button>
            <button type="button" className="btn-text-link" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
