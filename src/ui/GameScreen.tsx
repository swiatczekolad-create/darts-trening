import { useEffect, useState } from 'react';
import { dartLabel, type Dart } from '../engine/board';
import { botLevel, estimateAverage } from '../engine/bot';
import { MODES } from '../engine/modes';
import type { Game, PlayerInfo } from '../engine/types';
import type { Settings } from '../storage';
import { Dartboard } from './Dartboard';
import { Keypad } from './Keypad';
import { RulesSheet } from './RulesSheet';

interface Props {
  game: Game;
  controls: (p: PlayerInfo) => boolean;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onDart: (d: Dart) => void;
  onUndo?: () => void;
  onExit: () => void;
  onRematch?: () => void;
  onlineCode?: string;
}

export const playerTag = (p: PlayerInfo) => (p.kind === 'bot' ? `🤖 ${botLevel(p.level).name} (śr. ~${Math.round(estimateAverage(p.level ?? 3))})` : p.kind === 'remote' ? '🌐 online' : '');

export function GameScreen({ game, controls, settings, onSettings, onDart, onUndo, onExit, onRematch, onlineCode }: Props) {
  const mode = MODES[game.mode];
  const cur = game.players[game.cur];
  const view = mode.view(game, game.cur);
  const canInput = game.status === 'playing' && cur.kind !== 'bot' && controls(cur);
  const [toast, setToast] = useState<Game['msg']>();
  const [rules, setRules] = useState(false);

  useEffect(() => {
    if (!game.msg) return;
    setToast(game.msg);
    if (game.msg.kind === 'bonus') navigator.vibrate?.([40, 60, 40]);
    const t = setTimeout(() => setToast(undefined), game.msg.kind === 'bonus' ? 1800 : 1300);
    return () => clearTimeout(t);
  }, [game.msg?.id]);

  // Nie wygaszaj ekranu podczas treningu.
  useEffect(() => {
    let lock: any;
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock = l)).catch(() => {});
    return () => lock?.release?.();
  }, []);

  const last = game.history[game.history.length - 1];
  const waitingText = cur.kind === 'bot' ? `${cur.name} rzuca…` : `Rzuca ${cur.name}`;

  return (
    <div className="game">
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Wyjdź">
          ✕
        </button>
        <div className="topbar-title">
          <strong>{mode.name}</strong>
          {onlineCode && <span className="pill">Pokój {onlineCode}</span>}
        </div>
        <button className="icon-btn" onClick={() => setRules(true)} aria-label="Zasady">
          ?
        </button>
      </header>

      {game.players.length > 1 && (
        <div className="scoreboard">
          {game.players.map((p, i) => (
            <div key={p.id} className={`sb-player ${i === game.cur && game.status === 'playing' ? 'active' : ''} ${game.done[i] ? 'done' : ''}`}>
              <div className="sb-name">
                {p.name} <small>{playerTag(p)}</small>
              </div>
              <div className="sb-score">{mode.view(game, i).scoreLine}</div>
            </div>
          ))}
        </div>
      )}

      <section className={`target-panel ${game.bonus ? 'is-bonus' : ''}`}>
        <div className="tp-who">
          {game.players.length > 1 ? waitingText : cur.kind === 'bot' ? waitingText : view.bigLabel}
          {game.bonus > 0 && <span className="bonus-badge">BONUS ×{game.bonus}</span>}
        </div>
        {game.players.length > 1 && <div className="tp-label">{view.bigLabel}</div>}
        <div className="tp-big">{view.big}</div>
        {view.sub && <div className="tp-sub">{view.sub}</div>}
        {view.hint && <div className="tp-hint">{view.hint}</div>}
        <div className="turn-slots">
          {[0, 1, 2].map((i) => {
            const d = game.turn[i];
            return (
              <div key={i} className={`slot ${d ? (d.hit === true ? 'hit' : d.hit === false ? 'miss' : 'thrown') : ''}`}>
                {d ? dartLabel(d) : ''}
              </div>
            );
          })}
        </div>
        {last && game.turn.length === 0 && game.players.length > 1 && (
          <div className="last-turn">
            Ostatnio {game.players[last.p].name}: {last.darts.map(dartLabel).join(', ')}
          </div>
        )}
      </section>

      <section className="input-area">
        {settings.input === 'board' ? (
          <Dartboard targets={view.targets} marks={game.turn} disabled={!canInput} onDart={onDart} />
        ) : (
          <Keypad disabled={!canInput} onDart={onDart} />
        )}
        <div className="input-actions">
          {onUndo && (
            <button className="btn ghost" onClick={onUndo}>
              ↶ Cofnij
            </button>
          )}
          {settings.input === 'board' && (
            <button className="btn ghost" disabled={!canInput} onClick={() => onDart({ seg: 0, mult: 0 })}>
              Pudło
            </button>
          )}
          <button className="btn ghost" onClick={() => onSettings({ ...settings, input: settings.input === 'board' ? 'keys' : 'board' })}>
            {settings.input === 'board' ? '⌨ Klawiatura' : '◎ Tarcza'}
          </button>
        </div>
      </section>

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          {toast.text}
        </div>
      )}

      {game.status === 'finished' && <Results game={game} onExit={onExit} onRematch={onRematch} onUndo={onUndo} />}
      {rules && <RulesSheet modeId={game.mode} onClose={() => setRules(false)} />}
    </div>
  );
}

function Results({ game, onExit, onRematch, onUndo }: { game: Game; onExit: () => void; onRematch?: () => void; onUndo?: () => void }) {
  const mode = MODES[game.mode];
  const winner = game.players[game.ranking[0]];
  const solo = game.players.length === 1;
  return (
    <div className="overlay">
      <div className="sheet results">
        <div className="results-trophy">{solo ? '🎯' : '🏆'}</div>
        <h2>{solo ? 'Trening zakończony' : `Wygrywa ${winner.name}!`}</h2>
        <ol className="ranking">
          {game.ranking.map((i) => {
            const m = mode.metric(game, i);
            const st = game.stats[i];
            return (
              <li key={i}>
                <div className="rk-name">
                  {game.players[i].name} <small>{playerTag(game.players[i])}</small>
                </div>
                <div className="rk-line">{mode.view(game, i).scoreLine}</div>
                <div className="rk-meta">
                  {m && (
                    <span>
                      {m.label}: <b>{m.value.toFixed(m.decimals ?? 0)}</b>
                    </span>
                  )}
                  <span>Lotki: {st.darts}</span>
                  {st.judged > 0 && <span>Skuteczność: {Math.round((st.hits / st.judged) * 100)}%</span>}
                  {st.bonusTurns > 0 && <span>Bonusowe tury: {st.bonusTurns}</span>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="row">
          {onUndo && (
            <button className="btn ghost" onClick={onUndo}>
              ↶ Cofnij ostatnią
            </button>
          )}
          <button className="btn ghost" onClick={onExit}>
            Menu
          </button>
          {onRematch && (
            <button className="btn primary" onClick={onRematch}>
              Jeszcze raz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
