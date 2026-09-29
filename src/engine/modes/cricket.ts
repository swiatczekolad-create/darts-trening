import { BULL, T, type Dart } from '../board';
import type { Highlight, ModeDef } from '../types';
import { others } from './helpers';

export const CRICKET_NUMS = [20, 19, 18, 17, 16, 15, 25];

interface S {
  marks: Record<number, number>;
  pts: number;
  mk: number;
}

const closedAll = (s: S) => CRICKET_NUMS.every((n) => s.marks[n] >= 3);
export const markSym = (m: number) => ['·', '/', 'X', 'Ⓧ'][Math.min(m, 3)];

export const cricket: ModeDef<S> = {
  id: 'cricket',
  name: 'Cricket',
  category: 'Mecz',
  tagline: 'Zamykanie 15–20 i Bulla',
  race: true,
  maxTurns: (o) => Number(o.rounds),
  rules: [
    'Liczą się tylko 15, 16, 17, 18, 19, 20 i Bull.',
    'Numer zamykasz 3 znacznikami: single = 1, double = 2, treble = 3 (Bull: 25 = 1, 50 = 2).',
    'Trafienia w numer zamknięty przez ciebie, a otwarty u rywala, dają punkty.',
    'Wygrywa ten, kto zamknie wszystko i ma przynajmniej tyle punktów co rywale. Solo liczy się szybkość zamknięcia i MPR (znaczniki na rundę).',
  ],
  options: [{ key: 'rounds', label: 'Limit rund', def: '20', choices: ['15', '20', '30'].map((v) => ({ v, l: v })) }],
  init: () => ({ marks: Object.fromEntries(CRICKET_NUMS.map((n) => [n, 0])), pts: 0, mk: 0 }),
  dart(g, p, d) {
    const s: S = structuredClone(g.ps[p]);
    const valid = d.mult > 0 && CRICKET_NUMS.includes(d.seg);
    if (!valid) return { ps: s, hit: false };
    const cur = s.marks[d.seg];
    const add = d.mult;
    const extra = Math.max(0, add - Math.max(0, 3 - cur));
    s.marks[d.seg] = Math.min(3, cur + add);
    s.mk += add;
    if (extra > 0 && others(g, p).some((i) => (g.ps[i] as S).marks[d.seg] < 3)) s.pts += extra * d.seg;
    const best = Math.max(-1, ...others(g, p).map((i) => (g.ps[i] as S).pts));
    const finished = closedAll(s) && s.pts >= best;
    return { ps: s, hit: true, tk: d.seg === 25 ? 'Bull' : String(d.seg), finished, msg: finished ? { text: 'Wszystko zamknięte!', kind: 'win' } : undefined };
  },
  aim(g, p): Dart {
    const s = g.ps[p] as S;
    const open = CRICKET_NUMS.find((n) => s.marks[n] < 3);
    if (open) return open === 25 ? BULL : T(open);
    const scoring = CRICKET_NUMS.find((n) => others(g, p).some((i) => (g.ps[i] as S).marks[n] < 3));
    return scoring ? (scoring === 25 ? BULL : T(scoring)) : T(20);
  },
  view(g, p) {
    const s = g.ps[p] as S;
    const st = g.stats[p];
    const turns = st.turns + (g.cur === p && g.turn.length ? 1 : 0);
    const mpr = turns ? s.mk / turns : 0;
    const targets: Highlight[] = CRICKET_NUMS.filter((n) => s.marks[n] < 3).map((n) => ({ seg: n, ring: n === 25 ? 'bull' : 'all' }));
    return {
      big: String(s.pts),
      bigLabel: 'Punkty',
      sub: CRICKET_NUMS.map((n) => `${n === 25 ? 'B' : n}${markSym(s.marks[n])}`).join('  '),
      hint: `MPR ${mpr.toFixed(2)} · runda ${Math.min(st.turns + 1, Number(g.opts.rounds))}/${g.opts.rounds}`,
      scoreLine: `${s.pts} pkt · ${CRICKET_NUMS.filter((n) => s.marks[n] >= 3).length}/7 zamkn.`,
      targets,
    };
  },
  key: (g, p) => {
    const s = g.ps[p] as S;
    const closed = CRICKET_NUMS.reduce((a, n) => a + s.marks[n], 0);
    return (closedAll(s) ? 1e6 : 0) + s.pts * 100 + closed;
  },
  metric: (g, p) => {
    const s = g.ps[p] as S;
    const turns = g.stats[p].turns + g.stats[p].bonusTurns;
    return { value: turns ? s.mk / turns : 0, label: 'MPR (znaczniki/runda)', decimals: 2 };
  },
};
