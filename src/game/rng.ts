/** 可注入的随机数：核心逻辑不直接依赖 Math.random，保证可单测、可复现。 */

export type RNG = () => number;

export const mathRandom: RNG = () => Math.random();

/** [0, maxExclusive) 的整数 */
export function randomInt(rng: RNG, maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error(`randomInt: maxExclusive 必须为正数，收到 ${maxExclusive}`);
  return Math.floor(rng() * maxExclusive);
}

export function pick<T>(rng: RNG, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: 数组不能为空');
  return arr[randomInt(rng, arr.length)];
}

/** Fisher-Yates 洗牌，返回新数组 */
export function shuffle<T>(rng: RNG, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 顺序产生固定值的确定性 RNG（测试用）：seq 依次返回，越界重复最后一个 */
export function sequenceRng(seq: readonly number[]): RNG {
  let i = 0;
  return () => {
    const v = seq[Math.min(i, seq.length - 1)];
    i++;
    return v;
  };
}
