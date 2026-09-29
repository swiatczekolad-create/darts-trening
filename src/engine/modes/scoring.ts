import { BULL, dartLabel, dartScore, T } from '../board';
import type { ModeDef } from '../types';
import { hl, pct } from './helpers';

interface S {
  pts: number;
  n: number;
  s: number;
  d: number;
  t: number;
}

export const scoring: ModeDef<S> = {
  id: 'scoring',
  name: 'Seria w T20',
  category: 'Scoring',
  tagline: '99 lotek w treble: grupowanie i średnia',
  rules: [
    'Rzucasz serię lotek w jedno pole, domyślnie T20.',
    'Liczą się wszystkie zdobyte punkty. Statystyka pokazuje osobno trafienia w treble i w sam segment.',
    'Wynik to średnia na 3 lotki. Porównuj serie między sesjami.',
  ],
  options: [
    {
      key: 'seg',
      label: 'Pole',
      def: '20',
      choices: ['20', '19', '18', '17', '16', '25'].map((v) => ({ v, l: v === '25' ? 'Bull' : `T${v}` })),
    },
    {
      key: 'darts',
      label: 'Liczba lotek',
      def: '99',
      choices: ['30', '60', '99'].map((v) => ({ v, l: v })),
    },
  ],
  init: () => ({ pts: 0, n: 0, s: 0, d: 0, t: 0 }),
  dart(g, p, d) {
    const s = { ...(g.ps[p] as S) };
    const seg = Number(g.opts.seg);
    const inSeg = d.seg === seg && d.mult > 0;
    s.n++;
    s.pts += dartScore(d);
    if (inSeg) {
      if (d.mult === 3) s.t++;
      else if (d.mult === 2) s.d++;
      else s.s++;
    }
    const aim = seg === 25 ? BULL : T(seg);
    const hit = seg === 25 ? d.seg === 25 : d.seg === seg && d.mult === 3;
    const finished = s.n >= Number(g.opts.darts);
    return { ps: s, hit, tk: dartLabel(aim), finished };
  },
  aim: (g) => (g.opts.seg === '25' ? BULL : T(Number(g.opts.seg))),
  view(g, p) {
    const s = g.ps[p] as S;
    const seg = Number(g.opts.seg);
    const aim = seg === 25 ? BULL : T(seg);
    const avg = s.n ? (s.pts / s.n) * 3 : 0;
    return {
      big: avg.toFixed(1),
      bigLabel: `Średnia 3 lotek · cel ${dartLabel(aim)}`,
      sub: `Lotka ${Math.min(s.n + 1, Number(g.opts.darts))} z ${g.opts.darts} · ${s.pts} pkt`,
      hint: seg === 25 ? `Bull: ${pct(s.s + s.d, s.n)}%` : `T${seg}: ${pct(s.t, s.n)}% · segment ${seg}: ${pct(s.s + s.d + s.t, s.n)}%`,
      scoreLine: `śr. ${avg.toFixed(1)} · ${s.n}/${g.opts.darts}`,
      targets: hl(aim, seg === 25),
    };
  },
  key: (g, p) => (g.ps[p] as S).pts,
  metric: (g, p) => {
    const s = g.ps[p] as S;
    return { value: s.n ? (s.pts / s.n) * 3 : 0, label: 'Średnia 3 lotek', decimals: 1 };
  },
};
