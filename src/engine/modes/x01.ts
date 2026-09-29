import { dartLabel, dartScore, type Dart } from '../board';
import { checkoutRoute, setupAim } from '../checkout';
import type { Game, Msg } from '../types';

/** Wspólna logika odejmowania dla X01 i treningu checkoutów. */
export function subtract(rem: number, d: Dart, doubleOut: boolean): { rem: number; bust: boolean; out: boolean } {
  const nr = rem - dartScore(d);
  if (nr < 0 || (doubleOut && nr === 1) || (nr === 0 && doubleOut && d.mult !== 2)) return { rem, bust: true, out: false };
  return { rem: nr, bust: false, out: nr === 0 };
}

/** Czy przy tej reszcie lotka jest próbą zamknięcia jednym rzutem (do statystyk double). */
export function finishTarget(rem: number, doubleOut: boolean): Dart | null {
  if (!doubleOut) return null;
  if (rem === 50) return { seg: 25, mult: 2 };
  if (rem <= 40 && rem % 2 === 0) return { seg: rem / 2, mult: 2 };
  return null;
}

export function routeHint(rem: number, darts: number, doubleOut: boolean) {
  const r = checkoutRoute(rem, darts, doubleOut);
  return r ? r.map(dartLabel).join(' · ') : undefined;
}

export function aimFor(rem: number, dartsLeft: number, doubleOut: boolean): Dart {
  const r = checkoutRoute(rem, dartsLeft, doubleOut);
  return r ? r[0] : setupAim(rem, doubleOut);
}

export const bustMsg: Msg = { text: 'BUST!', kind: 'bust' };

export const turnStart = (g: Game, rem: number, prev: number) => (g.turn.length === 0 ? rem : prev);
