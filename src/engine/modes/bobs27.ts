import { BULL, D, dartLabel } from '../board';
import type { ModeDef } from '../types';
import { hl } from './helpers';

interface S {
  score: number;
  ri: number;
  out: boolean;
}

const ROUNDS = 21;
const target = (ri: number) => (ri < 20 ? D(ri + 1) : BULL);
const value = (ri: number) => (ri < 20 ? (ri + 1) * 2 : 50);

export const bobs27: ModeDef<S> = {
  id: 'bobs27',
  name: "Bob's 27",
  category: 'Double',
  tagline: 'Klasyczny trening double od D1 do Bulla',
  rules: [
    'Zaczynasz z 27 punktami. W każdej rundzie rzucasz 3 lotki w jeden double: D1, D2 i tak dalej aż do D20, na końcu Bull.',
    'Każde trafienie dodaje wartość double (D5 = 10 pkt).',
    'Jeśli w rundzie nie trafisz ani razu, odejmujesz wartość double.',
    'Gdy wynik spadnie do 0 lub niżej, gra się kończy (chyba że wyłączysz odpadanie).',
    'Maksimum to 1437 pkt.',
  ],
  options: [
    {
      key: 'ko',
      label: 'Odpadanie przy ≤ 0',
      def: 'yes',
      choices: [
        { v: 'yes', l: 'Tak' },
        { v: 'no', l: 'Nie, graj do końca' },
      ],
    },
  ],
  init: () => ({ score: 27, ri: 0, out: false }),
  dart(g, p, d) {
    const s = g.ps[p] as S;
    const t = target(s.ri);
    return { ps: s, hit: d.seg === t.seg && d.mult === 2, tk: dartLabel(t) };
  },
  endTurn(g, p) {
    const s = { ...(g.ps[p] as S) };
    const hits = g.turn.filter((t) => t.hit).length;
    const v = value(s.ri);
    s.score += hits ? hits * v : -v;
    s.ri++;
    let msg;
    if (s.score <= 0 && g.opts.ko === 'yes') {
      s.out = true;
      msg = { text: `Wynik ${s.score}, koniec gry`, kind: 'bad' as const };
    } else if (hits === 3) msg = { text: `3 z 3! +${3 * v}`, kind: 'bonus' as const };
    return { ps: s, done: s.out || s.ri >= ROUNDS, msg };
  },
  aim: (g, p) => target(Math.min((g.ps[p] as S).ri, ROUNDS - 1)),
  view(g, p) {
    const s = g.ps[p] as S;
    const done = s.ri >= ROUNDS || s.out;
    const t = target(Math.min(s.ri, ROUNDS - 1));
    const st = g.stats[p];
    return {
      big: done ? String(s.score) : dartLabel(t),
      bigLabel: done ? 'Wynik' : `Cel · wynik ${s.score}`,
      sub: `Runda ${Math.min(s.ri + 1, ROUNDS)} z ${ROUNDS}`,
      hint: `Trafione double: ${st.hits}/${st.judged} (${st.judged ? Math.round((st.hits / st.judged) * 100) : 0}%)`,
      scoreLine: `${s.score} pkt${s.out ? ' (odpadł)' : ''}`,
      targets: done ? [] : hl(t),
    };
  },
  key: (g, p) => {
    const s = g.ps[p] as S;
    return s.out ? -10000 + s.ri : s.score;
  },
  metric: (g, p) => ({ value: (g.ps[p] as S).score, label: 'Wynik' }),
};
