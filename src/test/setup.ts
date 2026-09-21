import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Node ≥22 自带实验性 globalThis.localStorage（未提供 --localstorage-file 时为 undefined），
// 会遮蔽 vitest jsdom 环境注入的 localStorage，导致 window.localStorage 读到 undefined。
// 此处用内存实现补齐，保证战绩持久化测试可确定性运行；生产行为不受影响（浏览器自带）。
if (!window.localStorage) {
  const mem = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (mem.has(key) ? (mem.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        mem.set(key, String(value));
      },
      removeItem: (key: string) => {
        mem.delete(key);
      },
      clear: () => {
        mem.clear();
      },
    },
  });
}

// 每个用例后卸载组件，避免跨用例 DOM 污染
afterEach(() => {
  cleanup();
  window.localStorage?.clear();
});
