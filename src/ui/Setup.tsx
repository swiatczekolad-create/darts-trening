import { useEffect, useState } from 'react';
import { BOT_LEVELS, estimateAverage } from '../engine/bot';
import { defaultOpts, uid } from '../engine/game';
import { MODES } from '../engine/modes';
import type { Opts, PlayerInfo } from '../engine/types';
import { Host } from '../net/online';
import type { Settings } from '../storage';
import { playerTag } from './GameScreen';
import { RulesSheet } from './RulesSheet';

const OPTS_KEY = (m: string) => `darts.opts.${m}`;

function loadOpts(modeId: string): Opts {
  try {
    return { ...defaultOpts(modeId), ...JSON.parse(localStorage.getItem(OPTS_KEY(modeId)) || '{}') };
  } catch {
    return defaultOpts(modeId);
  }
}

interface Props {
  modeId: string;
  settings: Settings;
  host: Host | null;
  initialPlayers?: PlayerInfo[];
  onHost: (h: Host | null) => void;
  onBack: () => void;
  onStart: (opts: Opts, players: PlayerInfo[]) => void;
}

export function Setup({ modeId, settings, host, initialPlayers, onHost, onBack, onStart }: Props) {
  const mode = MODES[modeId];
  const [opts, setOpts] = useState<Opts>(() => loadOpts(modeId));
  const [players, setPlayers] = useState<PlayerInfo[]>(
    () => initialPlayers ?? [{ id: uid(), name: settings.name, kind: 'human', owner: 'host' }]
  );
  const [botLvl, setBotLvl] = useState(3);
  const [friend, setFriend] = useState('');
  const [rules, setRules] = useState(false);
  const [netState, setNetState] = useState<'off' | 'opening' | 'error'>('off');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(OPTS_KEY(modeId), JSON.stringify(opts));
    } catch {
      /* ignoruj */
    }
  }, [opts, modeId]);

  // Obsługa gości online w lobby.
  useEffect(() => {
    if (!host) return;
    host.onGuestJoin = (id, name) =>
      setPlayers((ps) => (ps.some((p) => p.owner === id) ? ps : [...ps, { id: uid(), name, kind: 'remote', owner: id }]));
    host.onGuestLeave = (id) => setPlayers((ps) => ps.filter((p) => p.owner !== id));
  }, [host]);

  useEffect(() => {
    host?.broadcast({ t: 'lobby', mode: modeId, opts, players });
  }, [host, modeId, opts, players]);

  async function goOnline() {
    setNetState('opening');
    try {
      const h = new Host();
      await h.open();
      onHost(h);
      setNetState('off');
    } catch {
      setNetState('error');
    }
  }

  const link = host ? `${location.origin}${location.pathname}?join=${host.code}` : '';
  async function share() {
    const text = `Zagraj ze mną w darta (${mode.name}). Kod pokoju: ${host!.code}`;
    if (navigator.share) {
      navigator.share({ title: 'Darts Trening', text, url: link }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(`${text}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const move = (i: number, dir: -1 | 1) =>
    setPlayers((ps) => {
      const j = i + dir;
      if (j < 0 || j >= ps.length) return ps;
      const n = [...ps];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="setup">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Wróć">
          ←
        </button>
        <div className="topbar-title">
          <strong>{mode.name}</strong>
        </div>
        <button className="icon-btn" onClick={() => setRules(true)} aria-label="Zasady">
          ?
        </button>
      </header>

      <p className="muted center">{mode.tagline}</p>

      {mode.options.length > 0 && (
        <section className="card">
          <h3>Ustawienia</h3>
          {mode.options
            .filter((o) => !o.showIf || o.showIf(opts))
            .map((o) => (
              <div key={o.key} className="opt">
                <div className="opt-label">
                  {o.label}
                  {o.hint && <small>{o.hint}</small>}
                </div>
                <div className="chips">
                  {o.choices.map((c) => (
                    <button key={c.v} className={`chip ${opts[o.key] === c.v ? 'on' : ''}`} onClick={() => setOpts({ ...opts, [o.key]: c.v })}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </section>
      )}

      <section className="card">
        <h3>Gracze ({players.length})</h3>
        <ul className="players">
          {players.map((p, i) => (
            <li key={p.id}>
              <span className="pl-order">{i + 1}</span>
              <span className="pl-name">
                {p.name} <small>{playerTag(p)}</small>
              </span>
              <button className="icon-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="W górę">
                ↑
              </button>
              <button className="icon-btn sm" onClick={() => setPlayers(players.filter((x) => x.id !== p.id))} disabled={players.length === 1} aria-label="Usuń">
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className="add-row">
          <select value={botLvl} onChange={(e) => setBotLvl(Number(e.target.value))}>
            {BOT_LEVELS.map((b) => (
              <option key={b.level} value={b.level}>
                {b.level}. {b.name} (śr. ~{Math.round(estimateAverage(b.level))})
              </option>
            ))}
          </select>
          <button
            className="btn secondary"
            onClick={() => {
              const n = players.filter((p) => p.kind === 'bot').length;
              setPlayers([...players, { id: uid(), name: n ? `Bot ${n + 1}` : 'Bot', kind: 'bot', level: botLvl, owner: 'host' }]);
            }}
          >
            + Bot
          </button>
        </div>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const name = friend.trim() || `Gracz ${players.length + 1}`;
            setPlayers([...players, { id: uid(), name, kind: 'human', owner: 'host' }]);
            setFriend('');
          }}
        >
          <input placeholder="Imię gracza na tym telefonie" value={friend} maxLength={20} onChange={(e) => setFriend(e.target.value)} />
          <button className="btn secondary" type="submit">
            + Gracz
          </button>
        </form>
      </section>

      <section className="card">
        <h3>Gra online ze znajomymi</h3>
        {!host ? (
          <>
            <p className="muted">Utwórz pokój i wyślij znajomym kod. Każdy gra na swoim telefonie, nie trzeba zakładać konta.</p>
            <button className="btn secondary block" onClick={goOnline} disabled={netState === 'opening'}>
              {netState === 'opening' ? 'Tworzę pokój…' : '🌐 Utwórz pokój online'}
            </button>
            {netState === 'error' && <p className="error">Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.</p>}
          </>
        ) : (
          <div className="room">
            <div className="room-code">{host.code}</div>
            <p className="muted">Znajomi wybierają „Dołącz do gry znajomego” i wpisują ten kod albo otwierają link.</p>
            <div className="row">
              <button className="btn secondary grow" onClick={share}>
                {copied ? 'Skopiowano ✓' : 'Wyślij zaproszenie'}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  host.close();
                  onHost(null);
                  setPlayers((ps) => ps.filter((p) => p.kind !== 'remote'));
                }}
              >
                Zamknij pokój
              </button>
            </div>
            {!players.some((p) => p.kind === 'remote') && <p className="muted small">Czekam na graczy…</p>}
          </div>
        )}
      </section>

      <div className="sticky-cta">
        <button className="btn primary block big" onClick={() => onStart(opts, players)}>
          Start {players.length === 1 ? '— trening solo' : `— ${players.length} graczy`}
        </button>
      </div>
      {rules && <RulesSheet modeId={modeId} onClose={() => setRules(false)} />}
    </div>
  );
}
