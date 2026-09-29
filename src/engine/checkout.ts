import { BULL, D, dartScore, S, T, type Dart } from './board';

// Kolejność preferowanych double na zakończenie.
const FINISH_PREF = [20, 16, 18, 12, 10, 8, 19, 14, 17, 15, 13, 11, 9, 7, 6, 5, 4, 3, 2, 1];

const FINISH_DOUBLE: Dart[] = [...FINISH_PREF.map(D), BULL];
const SETUP: Dart[] = [
  ...[20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(S),
  ...[20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(T),
  { seg: 25, mult: 1 },
  BULL,
  ...FINISH_PREF.map(D),
];

function cost(d: Dart, i: number) {
  // Trudność rzutu: single najłatwiejszy, bull najtrudniejszy; i = pozycja w preferencjach.
  const base = d.seg === 25 ? 4 : d.mult === 3 ? 2 : d.mult === 2 ? 3 : 0;
  return base * 100 + i;
}

const cache = new Map<string, Dart[] | null>();

/** Najprostsza droga do zamknięcia `rem` w maks. `darts` lotkach. */
export function checkoutRoute(rem: number, darts: number, doubleOut = true): Dart[] | null {
  if (rem <= 0 || darts <= 0 || rem > 180) return null;
  const key = `${rem}|${darts}|${doubleOut}`;
  if (cache.has(key)) return cache.get(key)!;
  const finals = doubleOut ? FINISH_DOUBLE : [...SETUP];
  let best: Dart[] | null = null;
  let bestCost = Infinity;
  for (let n = 1; n <= darts && !best; n++) {
    const rec = (left: number, path: Dart[], c: number) => {
      if (path.length === n - 1) {
        finals.forEach((f, i) => {
          if (dartScore(f) === left) {
            const total = c + cost(f, i) * 2; // double kończący jest najważniejszy
            if (total < bestCost) {
              bestCost = total;
              best = [...path, f];
            }
          }
        });
        return;
      }
      SETUP.forEach((d, i) => {
        const v = dartScore(d);
        if (v < left) rec(left - v, [...path, d], c + cost(d, i));
      });
    };
    rec(rem, [], 0);
  }
  cache.set(key, best);
  return best;
}

/** Na co celować, gdy nie ma drogi do zamknięcia w tej turze. */
export function setupAim(rem: number, doubleOut = true): Dart {
  if (rem > 100) return T(20);
  if (!doubleOut) return rem >= 60 ? T(20) : rem > 20 ? S(20) : S(rem);
  // Zostaw sobie ulubiony double.
  for (const leave of [32, 40, 16, 24, 36, 20, 8, 4, 2]) {
    const s = rem - leave;
    if (s >= 1 && s <= 20) return S(s);
    if (s > 0 && s % 3 === 0 && s / 3 <= 20) return T(s / 3);
  }
  return rem > 60 ? T(20) : S(1);
}
