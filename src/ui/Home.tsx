import { useState } from 'react';
import { MODE_LIST } from '../engine/modes';
import type { Settings } from '../storage';
import { RulesSheet } from './RulesSheet';

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
  onPick: (modeId: string) => void;
  onJoin: () => void;
  onStats: () => void;
}

const CATS = ['Celność', 'Double', 'Scoring', 'Mecz'] as const;

export function Home({ settings, onSettings, onPick, onJoin, onStats }: Props) {
  const [rules, setRules] = useState<string | null>(null);
  const featured = MODE_LIST[0];
  return (
    <div className="home">
      <header className="home-head">
        <div>
          <h1>
            Darts <span>Trening</span>
          </h1>
          <label className="name-edit">
            Grasz jako
            <input value={settings.name} maxLength={20} onChange={(e) => onSettings({ ...settings, name: e.target.value })} onBlur={(e) => !e.target.value.trim() && onSettings({ ...settings, name: 'Ja' })} />
          </label>
        </div>
        <button className="icon-btn big" onClick={onStats} aria-label="Statystyki">
          📈
        </button>
      </header>

      <button className="featured" onClick={() => onPick(featured.id)}>
        <div className="featured-tag">Twój trening</div>
        <div className="featured-name">{featured.name}</div>
        <div className="featured-desc">{featured.tagline}. Double przesuwa o 2 pola, treble o 3.</div>
        <div className="featured-cta">Graj →</div>
      </button>

      <div className="row wrap">
        <button className="btn secondary grow" onClick={onJoin}>
          🌐 Dołącz do gry znajomego
        </button>
      </div>

      {CATS.map((cat) => {
        const modes = MODE_LIST.filter((m) => m.category === cat && m !== featured);
        if (!modes.length) return null;
        return (
          <section key={cat}>
            <h3 className="cat">{cat}</h3>
            <div className="mode-grid">
              {modes.map((m) => (
                <div key={m.id} className="mode-card" onClick={() => onPick(m.id)} role="button" tabIndex={0}>
                  <div className="mc-name">{m.name}</div>
                  <div className="mc-desc">{m.tagline}</div>
                  <button
                    className="mc-info"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRules(m.id);
                    }}
                    aria-label="Zasady"
                  >
                    ?
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p className="foot muted">Każdy tryb możesz grać solo, z botem (8 poziomów), ze znajomymi na jednym telefonie albo online.</p>
      {rules && <RulesSheet modeId={rules} onClose={() => setRules(null)} />}
    </div>
  );
}
