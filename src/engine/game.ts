import type { Dart } from './board';
import { MODES } from './modes';
import type { Game, Msg, Opts, PlayerInfo, PStats } from './types';

const emptyStats = (): PStats => ({ darts: 0, hits: 0, judged: 0, turns: 0, bonusTurns: 0, byTarget: {} });

export const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultOpts(modeId: string): Opts {
  const o: Opts = {};
  for (const spec of MODES[modeId].options) o[spec.key] = spec.def;
  return o;
}

export function newGame(modeId: string, opts: Opts, players: PlayerInfo[]): Game {
  const mode = MODES[modeId];
  const o = { ...defaultOpts(modeId), ...opts };
  return {
    id: uid(),
    mode: modeId,
    opts: o,
    players,
    ps: players.map(() => mode.init(o)),
    stats: players.map(emptyStats),
    done: players.map(() => false),
    cur: 0,
    turn: [],
    bonus: 0,
    status: 'playing',
    ranking: [],
    history: [],
    startedAt: Date.now(),
  };
}

function setMsg(g: Game, m?: Msg) {
  if (m) g.msg = { ...m, id: (g.msg?.id ?? 0) + 1 };
}

function finish(g: Game) {
  const mode = MODES[g.mode];
  g.status = 'finished';
  g.ranking = g.players.map((_, i) => i).sort((a, b) => mode.key(g, b) - mode.key(g, a));
}

function nextPlayer(g: Game) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (g.cur + k) % n;
    if (!g.done[i]) {
      g.cur = i;
      return;
    }
  }
}

function closeTurn(g: Game) {
  const mode = MODES[g.mode];
  const p = g.cur;
  const wasBonus = g.bonus > 0;
  const e = mode.endTurn ? mode.endTurn(g, p) : {};
  if (e.ps) g.ps[p] = e.ps;
  setMsg(g, e.msg);
  g.history.push({ p, darts: g.turn, bonus: wasBonus, note: e.msg?.text });
  if (wasBonus) g.stats[p].bonusTurns++;
  else g.stats[p].turns++;
  g.turn = [];
  if (e.done) g.done[p] = true;
  const max = mode.maxTurns?.(g.opts);
  if (max && g.stats[p].turns >= max) g.done[p] = true;
  if (e.winNow || g.done.every(Boolean)) return finish(g);
  if (e.bonus && !g.done[p]) {
    g.bonus++;
    return;
  }
  g.bonus = 0;
  nextPlayer(g);
}

export function applyDart(prev: Game, dart: Dart): Game {
  if (prev.status !== 'playing') return prev;
  const g: Game = structuredClone(prev);
  const mode = MODES[g.mode];
  const p = g.cur;
  const out = mode.dart(g, p, dart);
  g.ps[p] = out.ps;
  g.turn.push({ ...dart, hit: out.hit ?? null });
  const st = g.stats[p];
  st.darts++;
  if (out.hit != null) {
    st.judged++;
    if (out.hit) st.hits++;
    if (out.tk) {
      const t = (st.byTarget[out.tk] ??= [0, 0]);
      t[1]++;
      if (out.hit) t[0]++;
    }
  }
  setMsg(g, out.msg);
  if (out.finished) {
    g.done[p] = true;
    if (mode.race) {
      g.history.push({ p, darts: g.turn, bonus: g.bonus > 0 });
      if (g.bonus === 0) st.turns++;
      else st.bonusTurns++;
      g.turn = [];
      finish(g);
      return g;
    }
  }
  if (out.finished || out.endTurn || g.turn.length >= 3) closeTurn(g);
  return g;
}

/** Wynik zakończonej gry do statystyk. */
export function gameSummary(g: Game) {
  const mode = MODES[g.mode];
  return g.players.map((pl, i) => ({
    name: pl.name,
    kind: pl.kind,
    level: pl.level,
    place: g.ranking.indexOf(i) + 1,
    view: mode.view(g, i).scoreLine,
    metric: mode.metric(g, i),
    stats: g.stats[i],
  }));
}
