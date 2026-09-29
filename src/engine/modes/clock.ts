import { dartLabel, ORDER, type Dart } from '../board';
import { botLevel } from '../bot';
import type { ModeDef, Opts } from '../types';
import { hl } from './helpers';

interface S {
  idx: number;
}

const seqFor = (o: Opts) => {
  const base = o.order === 'board' ? ORDER : Array.from({ length: 20 }, (_, i) => i + 1);
  return o.bull === 'yes' ? [...base, 25] : base;
};

const targetDart = (seg: number, o: Opts): Dart => {
  if (seg === 25) return { seg: 25, mult: o.target === 'double' ? 2 : 1 };
  return { seg, mult: o.target === 'double' ? 2 : o.target === 'treble' ? 3 : 1 };
};

function isHit(d: Dart, seg: number, o: Opts) {
  if (d.mult === 0 || d.seg !== seg) return false;
  if (seg === 25) return o.target === 'double' ? d.mult === 2 : true;
  if (o.target === 'double') return d.mult === 2;
  if (o.target === 'treble') return d.mult === 3;
  return true;
}

const skipOn = (o: Opts) => o.target === 'any' && o.skip === 'yes';

export const clock: ModeDef<S> = {
  id: 'clock',
  name: 'Around the Clock+',
  category: 'Celność',
  tagline: 'Zegar z bonusową turą za 3 trafienia z rzędu',
  race: true,
  rules: [
    'Trafiasz kolejno pola od 1 do 20, a na koniec Bulla (kolejność i finisz można zmienić w opcjach).',
    'Każde trafienie w aktualny cel przesuwa cię na następne pole.',
    'Wariant B (domyślnie): double przesuwa o 2 pola, a treble o 3. Nie da się przeskoczyć Bulla.',
    'Bonusowa tura: jeśli w turze trafisz wszystkimi 3 lotkami, rzucasz od razu kolejną turę. Bonusowe tury trwają tak długo, jak trafiasz 3 z 3.',
    'Wygrywa ten, kto pierwszy skończy. W treningu solo liczy się liczba lotek, więc im mniej, tym lepiej.',
  ],
  options: [
    {
      key: 'target',
      label: 'Cel',
      def: 'any',
      choices: [
        { v: 'any', l: 'Całe pole' },
        { v: 'double', l: 'Tylko double' },
        { v: 'treble', l: 'Tylko treble' },
      ],
    },
    {
      key: 'skip',
      label: 'Double/treble przeskakuje',
      def: 'yes',
      hint: 'Wariant B: D = +2 pola, T = +3 pola',
      choices: [
        { v: 'yes', l: 'Tak (B)' },
        { v: 'no', l: 'Nie (+1)' },
      ],
      showIf: (o) => o.target === 'any',
    },
    {
      key: 'bonus',
      label: 'Bonusowa tura za 3/3',
      def: 'yes',
      choices: [
        { v: 'yes', l: 'Tak' },
        { v: 'no', l: 'Nie' },
      ],
    },
    {
      key: 'order',
      label: 'Kolejność',
      def: 'num',
      choices: [
        { v: 'num', l: '1 → 20' },
        { v: 'board', l: 'Po tarczy (20, 1, 18…)' },
      ],
    },
    {
      key: 'bull',
      label: 'Finisz na Bullu',
      def: 'yes',
      choices: [
        { v: 'yes', l: 'Tak' },
        { v: 'no', l: 'Nie' },
      ],
    },
  ],
  init: () => ({ idx: 0 }),
  dart(g, p, d) {
    const o = g.opts;
    const seq = seqFor(o);
    const s = g.ps[p] as S;
    const seg = seq[s.idx];
    const hit = isHit(d, seg, o);
    let idx = s.idx;
    let msg;
    if (hit) {
      const adv = skipOn(o) && seg !== 25 ? d.mult : 1;
      idx += adv;
      if (o.bull === 'yes' && seg !== 25) idx = Math.min(idx, seq.length - 1);
      const moved = idx - s.idx;
      if (moved > 1) msg = { text: `+${moved} pola!`, kind: 'info' as const };
    }
    const finished = idx >= seq.length;
    if (finished) msg = { text: `Koniec! ${g.stats[p].darts + 1} lotek`, kind: 'win' as const };
    return { ps: { idx }, hit, tk: dartLabel(targetDart(seg, o)), finished, msg };
  },
  endTurn(g) {
    if (g.opts.bonus === 'yes' && g.turn.length === 3 && g.turn.every((t) => t.hit)) {
      return { bonus: true, msg: { text: 'BONUSOWA TURA! 3 z 3', kind: 'bonus' } };
    }
    return {};
  },
  aim(g, p, level) {
    const seq = seqFor(g.opts);
    const seg = seq[Math.min((g.ps[p] as S).idx, seq.length - 1)];
    const t = targetDart(seg, g.opts);
    // Przy całym polu opłaca się celować w treble: pierścień leży w środku segmentu, a przy wariancie B daje +3.
    if (g.opts.target === 'any' && seg !== 25 && (skipOn(g.opts) || botLevel(level).sigma < 30)) return { seg, mult: 3 };
    return t;
  },
  view(g, p) {
    const seq = seqFor(g.opts);
    const s = g.ps[p] as S;
    const done = s.idx >= seq.length;
    const seg = seq[Math.min(s.idx, seq.length - 1)];
    const t = targetDart(seg, g.opts);
    const st = g.stats[p];
    return {
      big: done ? '✓' : dartLabel(t),
      bigLabel: 'Cel',
      sub: `Pole ${Math.min(s.idx + 1, seq.length)} z ${seq.length}`,
      hint: `${st.darts} lotek · skuteczność ${st.judged ? Math.round((st.hits / st.judged) * 100) : 0}%${st.bonusTurns ? ` · bonusy: ${st.bonusTurns}` : ''}`,
      scoreLine: done ? `Koniec: ${st.darts} lotek` : `→ ${dartLabel(t)}  (${s.idx}/${seq.length})`,
      targets: done ? [] : hl(t, g.opts.target === 'any'),
    };
  },
  key(g, p) {
    const s = g.ps[p] as S;
    const done = s.idx >= seqFor(g.opts).length;
    return done ? 1e6 - g.stats[p].darts : s.idx * 1000 - g.stats[p].darts;
  },
  metric(g, p) {
    const s = g.ps[p] as S;
    if (s.idx < seqFor(g.opts).length) return null;
    return { value: g.stats[p].darts, label: 'Lotki do końca', lowerBetter: true };
  },
};
