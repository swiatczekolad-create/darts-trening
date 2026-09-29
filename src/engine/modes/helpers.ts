import { ORDER, type Dart } from '../board';
import type { Game, Highlight } from '../types';

export function hl(d: Dart, any = false): Highlight[] {
  if (d.seg === 25) return [{ seg: 25, ring: any ? 'bull' : d.mult === 2 ? 'dbull' : 'bull' }];
  if (any) return [{ seg: d.seg, ring: 'all' }];
  return [{ seg: d.seg, ring: d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : 'S' }];
}

export const allRings = (ring: 'D' | 'T'): Highlight[] => ORDER.map((seg) => ({ seg, ring }));

export const others = (g: Game, p: number) => g.players.map((_, i) => i).filter((i) => i !== p);

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
