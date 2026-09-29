import { aimPoint, dartScore, hitTest, T, type Dart } from './board';

export interface BotLevel {
  level: number;
  name: string;
  /** Odchylenie standardowe rozrzutu w mm (na oś). */
  sigma: number;
}

export const BOT_LEVELS: BotLevel[] = [
  { level: 1, name: 'Nowicjusz', sigma: 100 },
  { level: 2, name: 'Amator', sigma: 55 },
  { level: 3, name: 'Pubowy', sigma: 32 },
  { level: 4, name: 'Ligowy', sigma: 21 },
  { level: 5, name: 'Zaawansowany', sigma: 15 },
  { level: 6, name: 'Pro', sigma: 11 },
  { level: 7, name: 'Mistrz świata', sigma: 8.5 },
  { level: 8, name: 'Legenda', sigma: 6.5 },
];

export const botLevel = (level = 3) => BOT_LEVELS.find((b) => b.level === level) ?? BOT_LEVELS[2];

function gauss(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function botThrow(aim: Dart, level: number, rand: () => number = Math.random): Dart {
  const [ax, ay] = aimPoint(aim);
  const s = botLevel(level).sigma;
  return hitTest(ax + gauss(rand) * s, ay + gauss(rand) * s);
}

const avgCache = new Map<number, number>();

/** Szacowana średnia 3-lotkowa bota rzucającego w T20 (Monte Carlo). */
export function estimateAverage(level: number): number {
  const hit = avgCache.get(level);
  if (hit !== undefined) return hit;
  let seed = 12345 + level;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) sum += dartScore(botThrow(T(20), level, rand));
  const avg = (sum / n) * 3;
  avgCache.set(level, avg);
  return avg;
}
