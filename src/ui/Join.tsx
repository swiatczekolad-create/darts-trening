import { useState } from 'react';
import { MODES } from '../engine/modes';
import type { Opts, PlayerInfo } from '../engine/types';
import { playerTag } from './GameScreen';

interface Props {
  initialCode?: string;
  name: string;
  lobby: { mode: string; opts: Opts; players: PlayerInfo[] } | null;
  connected: boolean;
  error?: string;
  onJoin: (code: string, name: string) => Promise<void>;
  onBack: () => void;
}

export function Join({ initialCode = '', name: initialName, lobby, connected, error, onJoin, onBack }: Props) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  return (
    <div className="setup">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Wróć">
          ←
        </button>
        <div className="topbar-title">
          <strong>Dołącz do gry</strong>
        </div>
        <span />
      </header>

      {!connected ? (
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await onJoin(code, name.trim() || 'Gość').finally(() => setBusy(false));
          }}
        >
          <h3>Kod pokoju</h3>
          <input className="code-input" value={code} maxLength={5} autoCapitalize="characters" placeholder="ABCDE" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <h3>Twoje imię</h3>
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block big" disabled={code.length !== 5 || busy}>
            {busy ? 'Łączę…' : 'Dołącz'}
          </button>
        </form>
      ) : (
        <section className="card">
          <h3>Połączono ✓</h3>
          {lobby ? (
            <>
              <p>
                Tryb: <b>{MODES[lobby.mode]?.name}</b>
              </p>
              <ul className="players">
                {lobby.players.map((p, i) => (
                  <li key={p.id}>
                    <span className="pl-order">{i + 1}</span>
                    <span className="pl-name">
                      {p.name} <small>{playerTag(p)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="muted">Czekaj, aż host rozpocznie grę…</p>
          {error && <p className="error">{error}</p>}
        </section>
      )}
    </div>
  );
}
