import { dartScore, T } from '../board';
import type { ModeDef } from '../types';
import { hl } from './helpers';

interface S {
  score: number;
  ri: number;
  shanghai: boolean;
}

const rounds = (o: Record<string, string>) => Number(o.rounds);

export const shanghai: ModeDef<S> = {
  id: 'shanghai',
  name: 'Shanghai',
  category: 'Celność',
  tagline: 'Single, double i treble jednego numeru',
  rules: [
    'Runda 1: rzucasz w 1, runda 2: w 2 i tak dalej.',
    'Liczą się tylko trafienia w numer rundy: single = wartość, double = 2×, treble = 3×.',
    'SHANGHAI to single, double i treble tego samego numeru w jednej turze. Oznacza natychmiastowe zwycięstwo.',
    'Po ostatniej rundzie wygrywa najwyższy wynik.',
  ],
  options: [
    {
      key: 'rounds',
      label: 'Liczba rund',
      def: '7',
      choices: [
        { v: '7', l: '1–7' },
        { v: '10', l: '1–10' },
        { v: '20', l: '1–20' },
      ],
    },
  ],
  init: () => ({ score: 0, ri: 0, shanghai: false }),
  dart(g, p, d) {
    const s = g.ps[p] as S;
    const seg = s.ri + 1;
    const hit = d.seg === seg && d.mult > 0;
    return { ps: { ...s, score: s.score + (hit ? dartScore(d) : 0) }, hit, tk: String(seg) };
  },
  endTurn(g, p) {
    const s = { ...(g.ps[p] as S) };
    const mults = new Set(g.turn.filter((t) => t.hit).map((t) => t.mult));
    s.ri++;
    if (mults.has(1) && mults.has(2) && mults.has(3)) {
      s.shanghai = true;
      return { ps: s, winNow: true, done: true, msg: { text: 'SHANGHAI!', kind: 'win' } };
    }
    return { ps: s, done: s.ri >= rounds(g.opts) };
  },
  aim: (g, p) => T(Math.min((g.ps[p] as S).ri + 1, 20)),
  view(g, p) {
    const s = g.ps[p] as S;
    const n = rounds(g.opts);
    const done = s.ri >= n;
    return {
      big: done ? String(s.score) : String(s.ri + 1),
      bigLabel: done ? 'Wynik' : `Numer · wynik ${s.score}`,
      sub: `Runda ${Math.min(s.ri + 1, n)} z ${n}`,
      hint: 'S + D + T w jednej turze = Shanghai',
      scoreLine: `${s.score} pkt${s.shanghai ? ' · SHANGHAI' : ''}`,
      targets: done ? [] : hl({ seg: s.ri + 1, mult: 1 }, true),
    };
  },
  key: (g, p) => {
    const s = g.ps[p] as S;
    return s.score + (s.shanghai ? 1e6 : 0);
  },
  metric: (g, p) => ({ value: (g.ps[p] as S).score, label: 'Punkty' }),
};
