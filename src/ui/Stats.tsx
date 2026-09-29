import { useMemo, useState } from 'react';
import { MODE_LIST, MODES } from '../engine/modes';
import { clearHistory, loadHistory, type GameRecord } from '../storage';

function Spark({ values, lowerBetter }: { values: number[]; lowerBetter?: boolean }) {
  if (values.length < 2) return null;
  const w = 240;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 6 - ((v - min) / span) * (h - 12)]);
  const first = values[0];
  const lastV = values[values.length - 1];
  const better = lowerBetter ? lastV <= first : lastV >= first;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className={better ? 'up' : 'down'} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} className={better ? 'up' : 'down'} />
      ))}
    </svg>
  );
}

const fmt = (v: number, d = 0) => v.toFixed(d);

export function Stats({ defaultName, onBack }: { defaultName: string; onBack: () => void }) {
  const [history, setHistory] = useState<GameRecord[]>(loadHistory);
  const names = useMemo(() => {
    const s = new Set<string>();
    history.forEach((r) => r.players.forEach((p) => p.kind === 'human' && s.add(p.name)));
    return [...s];
  }, [history]);
  const [name, setName] = useState(names.includes(defaultName) ? defaultName : names[0] ?? defaultName);

  const mine = useMemo(
    () =>
      history
        .map((r) => ({ r, p: r.players.find((p) => p.kind === 'human' && p.name === name) }))
        .filter((x): x is { r: GameRecord; p: GameRecord['players'][number] } => !!x.p),
    [history, name]
  );

  const totals = mine.reduce(
    (a, { p }) => ({ darts: a.darts + p.stats.darts, hits: a.hits + p.stats.hits, judged: a.judged + p.stats.judged, bonus: a.bonus + p.stats.bonusTurns }),
    { darts: 0, hits: 0, judged: 0, bonus: 0 }
  );

  const targets = useMemo(() => {
    const agg: Record<string, [number, number]> = {};
    mine.forEach(({ p }) =>
      Object.entries(p.stats.byTarget).forEach(([k, [h, n]]) => {
        const t = (agg[k] ??= [0, 0]);
        t[0] += h;
        t[1] += n;
      })
    );
    return Object.entries(agg)
      .filter(([, [, n]]) => n >= 3)
      .sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  }, [mine]);

  return (
    <div className="stats">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Wróć">
          ←
        </button>
        <div className="topbar-title">
          <strong>Statystyki</strong>
        </div>
        <span />
      </header>

      {names.length > 1 && (
        <div className="chips center">
          {names.map((n) => (
            <button key={n} className={`chip ${n === name ? 'on' : ''}`} onClick={() => setName(n)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {mine.length === 0 ? (
        <p className="muted center">Brak rozegranych gier. Zagraj trening, a tu pojawią się twoje postępy.</p>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <b>{mine.length}</b>
              <span>gier</span>
            </div>
            <div className="tile">
              <b>{totals.darts}</b>
              <span>lotek</span>
            </div>
            <div className="tile">
              <b>{totals.judged ? Math.round((totals.hits / totals.judged) * 100) : 0}%</b>
              <span>trafień w cel</span>
            </div>
            <div className="tile">
              <b>{totals.bonus}</b>
              <span>bonusowych tur</span>
            </div>
          </div>

          {MODE_LIST.map((m) => {
            const games = mine.filter((x) => x.r.mode === m.id && x.p.metric);
            if (!games.length) return null;
            const vals = games.map((x) => x.p.metric!.value).reverse();
            const metric = games[0].p.metric!;
            const best = metric.lowerBetter ? Math.min(...vals) : Math.max(...vals);
            const last10 = vals.slice(-10);
            const avg = last10.reduce((a, b) => a + b, 0) / last10.length;
            return (
              <section key={m.id} className="card">
                <h3>
                  {m.name} <small className="muted">· {games.length} gier</small>
                </h3>
                <div className="mstats">
                  <div>
                    <span>Rekord</span>
                    <b>{fmt(best, metric.decimals)}</b>
                  </div>
                  <div>
                    <span>Średnia (ost. 10)</span>
                    <b>{fmt(avg, metric.decimals ?? 1)}</b>
                  </div>
                  <div>
                    <span>Ostatnio</span>
                    <b>{fmt(vals[vals.length - 1], metric.decimals)}</b>
                  </div>
                </div>
                <div className="muted small">
                  {metric.label}
                  {metric.lowerBetter ? ' (mniej = lepiej)' : ''}
                </div>
                <Spark values={vals.slice(-20)} lowerBetter={metric.lowerBetter} />
              </section>
            );
          })}

          {targets.length > 0 && (
            <section className="card">
              <h3>Skuteczność na polach</h3>
              <p className="muted small">Od najsłabszych. Tu warto potrenować.</p>
              <div className="target-grid">
                {targets.map(([k, [h, n]]) => {
                  const p = Math.round((h / n) * 100);
                  return (
                    <div key={k} className="tg" style={{ ['--p' as any]: p }}>
                      <b>{k}</b>
                      <span>{p}%</span>
                      <small>
                        {h}/{n}
                      </small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="card">
            <h3>Ostatnie gry</h3>
            <ul className="recent">
              {mine.slice(0, 15).map(({ r, p }) => (
                <li key={r.id}>
                  <span>
                    {MODES[r.mode]?.name ?? r.mode}
                    {r.players.length > 1 && <small className="muted"> · {p.place}. miejsce z {r.players.length}</small>}
                  </span>
                  <span className="muted">{p.view}</span>
                  <small className="muted">{new Date(r.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                </li>
              ))}
            </ul>
          </section>

          <button
            className="btn ghost block"
            onClick={() => {
              if (confirm('Usunąć całą historię gier z tego urządzenia?')) {
                clearHistory();
                setHistory([]);
              }
            }}
          >
            Wyczyść historię
          </button>
        </>
      )}
    </div>
  );
}
