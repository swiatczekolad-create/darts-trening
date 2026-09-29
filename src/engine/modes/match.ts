import { dartLabel } from '../board';
import type { ModeDef } from '../types';
import { aimFor, bustMsg, finishTarget, routeHint, subtract, turnStart } from './x01';

interface S {
  rem: number;
  ts: number;
}

export const x01: ModeDef<S> = {
  id: 'x01',
  name: 'X01 (501 / 301)',
  category: 'Mecz',
  tagline: 'Klasyczny mecz z podpowiedziami checkoutów',
  race: true,
  rules: [
    'Odejmujesz zdobyte punkty od 501 (albo 301 lub 701).',
    'Kończysz dokładnie na 0. Przy double out ostatnia lotka musi trafić w double lub Bull.',
    'Bust (za dużo, zostaje 1 albo zamknięcie nie na double) cofa wynik do początku tury.',
    'Gdy możesz zamknąć, aplikacja podpowiada checkout.',
  ],
  options: [
    { key: 'start', label: 'Start', def: '501', choices: ['301', '501', '701'].map((v) => ({ v, l: v })) },
    {
      key: 'out',
      label: 'Zakończenie',
      def: 'double',
      choices: [
        { v: 'double', l: 'Double out' },
        { v: 'single', l: 'Single out' },
      ],
    },
  ],
  init: (o) => ({ rem: Number(o.start), ts: Number(o.start) }),
  dart(g, p, d) {
    const s = g.ps[p] as S;
    const dbl = g.opts.out === 'double';
    const ts = turnStart(g, s.rem, s.ts);
    const ft = finishTarget(s.rem, dbl);
    const r = subtract(s.rem, d, dbl);
    if (r.bust) return { ps: { rem: ts, ts }, endTurn: true, msg: bustMsg, hit: ft ? false : null, tk: ft ? dartLabel(ft) : undefined };
    return {
      ps: { rem: r.rem, ts },
      finished: r.out,
      hit: ft ? r.out : null,
      tk: ft ? dartLabel(ft) : undefined,
      msg: r.out ? { text: 'CHECKOUT!', kind: 'win' } : undefined,
    };
  },
  aim: (g, p) => aimFor((g.ps[p] as S).rem, 3 - g.turn.length, g.opts.out === 'double'),
  view(g, p) {
    const s = g.ps[p] as S;
    const st = g.stats[p];
    const start = Number(g.opts.start);
    const avg = st.darts ? ((start - s.rem) / st.darts) * 3 : 0;
    const route = routeHint(s.rem, g.cur === p ? 3 - g.turn.length : 3, g.opts.out === 'double');
    return {
      big: String(s.rem),
      bigLabel: 'Zostało',
      sub: `Średnia ${avg.toFixed(1)} · lotek ${st.darts}`,
      hint: route ? `Checkout: ${route}` : undefined,
      scoreLine: `${s.rem}  ·  śr. ${avg.toFixed(1)}`,
    };
  },
  key: (g, p) => ((g.ps[p] as S).rem === 0 ? 1e6 - g.stats[p].darts : -(g.ps[p] as S).rem),
  metric: (g, p) => {
    const st = g.stats[p];
    const s = g.ps[p] as S;
    return { value: st.darts ? ((Number(g.opts.start) - s.rem) / st.darts) * 3 : 0, label: 'Średnia 3 lotek', decimals: 1 };
  },
};

interface CS {
  target: number;
  rem: number;
  ts: number;
  used: number;
  attempt: number;
  success: number;
  best: number;
}

export const checkout: ModeDef<CS> = {
  id: 'checkout',
  name: 'Checkout 121',
  category: 'Double',
  tagline: 'Zamknij 121 w 9 lotkach, potem 122…',
  rules: [
    'Masz 9 lotek (3 tury), żeby zamknąć wynik startowy, domyślnie 121, kończąc na double.',
    'Po udanym checkoucie cel rośnie o 1, a po nieudanym zostaje ten sam.',
    'Obowiązują zasady bust z X01. Bust kończy turę.',
    'Gra trwa ustaloną liczbę prób. Liczy się najwyższy zamknięty cel i liczba udanych prób.',
  ],
  options: [
    { key: 'start', label: 'Cel startowy', def: '121', choices: ['61', '81', '101', '121', '141'].map((v) => ({ v, l: v })) },
    { key: 'attempts', label: 'Liczba prób', def: '10', choices: ['5', '10', '20'].map((v) => ({ v, l: v })) },
    {
      key: 'per',
      label: 'Lotki na próbę',
      def: '9',
      choices: [
        { v: '6', l: '6 (2 tury)' },
        { v: '9', l: '9 (3 tury)' },
      ],
    },
  ],
  init: (o) => {
    const t = Number(o.start);
    return { target: t, rem: t, ts: t, used: 0, attempt: 0, success: 0, best: 0 };
  },
  dart(g, p, d) {
    const s = { ...(g.ps[p] as CS) };
    const per = Number(g.opts.per);
    const attempts = Number(g.opts.attempts);
    s.ts = turnStart(g, s.rem, s.ts);
    const ft = finishTarget(s.rem, true);
    const r = subtract(s.rem, d, true);
    s.used++;
    const base = { hit: ft ? r.out : null, tk: ft ? dartLabel(ft) : undefined };
    if (r.out) {
      s.success++;
      s.best = Math.max(s.best, s.target);
      s.target++;
      s.attempt++;
      s.rem = s.ts = s.target;
      s.used = 0;
      return { ps: s, ...base, endTurn: true, finished: s.attempt >= attempts, msg: { text: `Checkout! Następny cel: ${s.target}`, kind: 'win' } };
    }
    let msg;
    let endTurn = false;
    if (r.bust) {
      s.rem = s.ts;
      s.used = Math.ceil(s.used / 3) * 3;
      endTurn = true;
      msg = bustMsg;
    } else s.rem = r.rem;
    if (s.used >= per) {
      s.attempt++;
      s.rem = s.ts = s.target;
      s.used = 0;
      endTurn = true;
      msg = { text: `Nie tym razem. Cel zostaje: ${s.target}`, kind: 'bad' as const };
    }
    return { ps: s, ...base, endTurn, finished: s.attempt >= attempts, msg };
  },
  aim(g, p) {
    const s = g.ps[p] as CS;
    return aimFor(s.rem, Math.min(3 - g.turn.length, Number(g.opts.per) - s.used), true);
  },
  view(g, p) {
    const s = g.ps[p] as CS;
    const per = Number(g.opts.per);
    const attempts = Number(g.opts.attempts);
    const done = s.attempt >= attempts;
    const route = routeHint(s.rem, Math.min(3 - (g.cur === p ? g.turn.length : 0), per - s.used), true);
    return {
      big: done ? String(s.success) : String(s.rem),
      bigLabel: done ? 'Udane checkouty' : `Zostało · cel ${s.target}`,
      sub: done ? `Najwyższy zamknięty: ${s.best || '—'}` : `Próba ${s.attempt + 1} z ${attempts} · lotki ${s.used}/${per}`,
      hint: !done && route ? `Checkout: ${route}` : undefined,
      scoreLine: `${s.success}/${s.attempt} · cel ${s.target}`,
    };
  },
  key: (g, p) => {
    const s = g.ps[p] as CS;
    return s.success * 1000 + s.best;
  },
  metric: (g, p) => ({ value: (g.ps[p] as CS).success, label: 'Udane checkouty' }),
};
