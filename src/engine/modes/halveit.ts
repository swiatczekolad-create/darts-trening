import { BULL, D, dartScore, T, type Dart } from '../board';
import type { Highlight, ModeDef } from '../types';
import { allRings, hl } from './helpers';

type Tgt = { k: 'seg'; seg: number } | { k: 'D' } | { k: 'T' } | { k: 'bull' };

const TARGETS: Tgt[] = [
  { k: 'seg', seg: 15 },
  { k: 'seg', seg: 16 },
  { k: 'D' },
  { k: 'seg', seg: 17 },
  { k: 'seg', seg: 18 },
  { k: 'T' },
  { k: 'seg', seg: 19 },
  { k: 'seg', seg: 20 },
  { k: 'bull' },
];

const tLabel = (t: Tgt) => (t.k === 'seg' ? String(t.seg) : t.k === 'D' ? 'Dowolny D' : t.k === 'T' ? 'Dowolny T' : 'Bull');

function matches(t: Tgt, d: Dart) {
  if (d.mult === 0) return false;
  if (t.k === 'seg') return d.seg === t.seg;
  if (t.k === 'D') return d.mult === 2;
  if (t.k === 'T') return d.mult === 3;
  return d.seg === 25;
}

const tHl = (t: Tgt): Highlight[] =>
  t.k === 'seg' ? hl({ seg: t.seg, mult: 1 }, true) : t.k === 'D' ? [...allRings('D'), { seg: 25, ring: 'dbull' }] : t.k === 'T' ? allRings('T') : hl(BULL, true);

interface S {
  score: number;
  ri: number;
}

export const halveit: ModeDef<S> = {
  id: 'halveit',
  name: 'Halve-It',
  category: 'Celność',
  tagline: 'Pudło w rundzie = połowa punktów',
  rules: [
    'Cele po kolei: 15, 16, dowolny double, 17, 18, dowolny treble, 19, 20, Bull.',
    'Trafienia w cel dodają ich punkty.',
    'Jeśli w rundzie nie trafisz celu ani razu, twój wynik spada o połowę.',
    'Uczy trafiania pod presją.',
  ],
  options: [
    {
      key: 'start',
      label: 'Punkty startowe',
      def: '40',
      choices: [
        { v: '0', l: '0' },
        { v: '40', l: '40' },
        { v: '100', l: '100' },
      ],
    },
  ],
  init: (o) => ({ score: Number(o.start), ri: 0 }),
  dart(g, p, d) {
    const s = g.ps[p] as S;
    const t = TARGETS[s.ri];
    const hit = matches(t, d);
    return { ps: { ...s, score: s.score + (hit ? dartScore(d) : 0) }, hit, tk: tLabel(t) };
  },
  endTurn(g, p) {
    const s = { ...(g.ps[p] as S) };
    let msg;
    if (!g.turn.some((t) => t.hit)) {
      s.score = Math.floor(s.score / 2);
      msg = { text: `Połowa! Wynik ${s.score}`, kind: 'bad' as const };
    }
    s.ri++;
    return { ps: s, done: s.ri >= TARGETS.length, msg };
  },
  aim(g, p) {
    const t = TARGETS[Math.min((g.ps[p] as S).ri, TARGETS.length - 1)];
    return t.k === 'seg' ? T(t.seg) : t.k === 'D' ? D(20) : t.k === 'T' ? T(20) : BULL;
  },
  view(g, p) {
    const s = g.ps[p] as S;
    const done = s.ri >= TARGETS.length;
    const t = TARGETS[Math.min(s.ri, TARGETS.length - 1)];
    return {
      big: done ? String(s.score) : tLabel(t),
      bigLabel: done ? 'Wynik' : `Cel · wynik ${s.score}`,
      sub: `Runda ${Math.min(s.ri + 1, TARGETS.length)} z ${TARGETS.length}`,
      hint: 'Brak trafienia w rundzie = wynik / 2',
      scoreLine: `${s.score} pkt`,
      targets: done ? [] : tHl(t),
    };
  },
  key: (g, p) => (g.ps[p] as S).score,
  metric: (g, p) => ({ value: (g.ps[p] as S).score, label: 'Punkty' }),
};
