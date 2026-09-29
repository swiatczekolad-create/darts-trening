import { useEffect, useReducer, useRef, useState } from 'react';
import type { Dart } from './engine/board';
import { botThrow } from './engine/bot';
import { applyDart, newGame } from './engine/game';
import { MODES } from './engine/modes';
import type { Game, Opts, PlayerInfo } from './engine/types';
import { Guest, Host } from './net/online';
import { loadSettings, saveGame, saveSettings, type Settings } from './storage';
import { GameScreen } from './ui/GameScreen';
import { Home } from './ui/Home';
import { Join } from './ui/Join';
import { Setup } from './ui/Setup';
import { Stats } from './ui/Stats';

type Screen = 'home' | 'setup' | 'game' | 'stats' | 'join';

interface GS {
  game: Game | null;
  past: Game[];
}
type Action = { t: 'start'; game: Game } | { t: 'dart'; dart: Dart } | { t: 'undo' } | { t: 'set'; game: Game | null };

function reducer(s: GS, a: Action): GS {
  switch (a.t) {
    case 'start':
      return { game: a.game, past: [] };
    case 'set':
      return { game: a.game, past: [] };
    case 'dart':
      if (!s.game) return s;
      return { game: applyDart(s.game, a.dart), past: [...s.past.slice(-300), s.game] };
    case 'undo': {
      if (!s.past.length) return s;
      // Cofamy ostatni rzut człowieka razem z rzutami botów, które po nim nastąpiły.
      let i = s.past.length - 1;
      while (i > 0 && s.past[i].players[s.past[i].cur].kind === 'bot') i--;
      return { game: s.past[i], past: s.past.slice(0, i) };
    }
  }
}

/** Zapis z perspektywy tego urządzenia: „human” = gracze grający tutaj. */
function forThisDevice(g: Game, myOwner: string): Game {
  return {
    ...g,
    players: g.players.map((p) => ({ ...p, kind: p.kind === 'bot' ? 'bot' : p.owner === myOwner ? 'human' : 'remote' })),
  };
}

export default function App() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const setSettings = (s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  };

  const joinParam = new URLSearchParams(location.search).get('join') ?? undefined;
  const [screen, setScreen] = useState<Screen>(joinParam ? 'join' : 'home');
  const [modeId, setModeId] = useState('clock');
  const [lastSetup, setLastSetup] = useState<{ mode: string; opts: Opts; players: PlayerInfo[] } | null>(null);
  const [{ game, past }, dispatch] = useReducer(reducer, { game: null, past: [] });
  const gameRef = useRef(game);
  const pastRef = useRef(past);
  gameRef.current = game;
  pastRef.current = past;

  // Online
  const [host, setHost] = useState<Host | null>(null);
  const [, forceTick] = useState(0);
  const guestRef = useRef<Guest | null>(null);
  const [guestId, setGuestId] = useState('');
  const [lobby, setLobby] = useState<{ mode: string; opts: Opts; players: PlayerInfo[] } | null>(null);
  const [guestErr, setGuestErr] = useState<string>();
  const isGuest = !!guestId;

  // Host: rozsyłanie stanu i przyjmowanie rzutów gości.
  useEffect(() => {
    if (!host || !game) return;
    host.broadcast({ t: 'game', game });
  }, [host, game]);

  useEffect(() => {
    if (!host) return;
    host.onAction = (id, msg) => {
      const g = gameRef.current;
      if (!g || g.status !== 'playing' && msg.t === 'dart') return;
      if (msg.t === 'dart' && g.players[g.cur].owner === id) dispatch({ t: 'dart', dart: msg.dart });
      if (msg.t === 'undo') {
        const prev = pastRef.current[pastRef.current.length - 1];
        if (prev && prev.players[prev.cur].owner === id) dispatch({ t: 'undo' });
      }
    };
    if (screen === 'game') host.onGuestLeave = () => forceTick((n) => n + 1);
  }, [host, screen]);

  // Boty rzucają same (u hosta lub lokalnie).
  useEffect(() => {
    if (!game || game.status !== 'playing' || isGuest || screen !== 'game') return;
    const p = game.players[game.cur];
    if (p.kind !== 'bot') return;
    const t = setTimeout(
      () => {
        const g = gameRef.current!;
        const aim = MODES[g.mode].aim(g, g.cur, p.level ?? 3);
        dispatch({ t: 'dart', dart: botThrow(aim, p.level ?? 3) });
      },
      game.turn.length === 0 ? 1000 : 700
    );
    return () => clearTimeout(t);
  }, [game, isGuest, screen]);

  // Zapis wyniku zakończonej gry.
  useEffect(() => {
    if (game?.status === 'finished') saveGame(forThisDevice(game, isGuest ? guestId : 'host'), !!host || isGuest);
  }, [game?.status, game?.id]);

  function start(opts: Opts, players: PlayerInfo[]) {
    setLastSetup({ mode: modeId, opts, players });
    dispatch({ t: 'start', game: newGame(modeId, opts, players) });
    setScreen('game');
  }

  function rematch() {
    if (!game) return;
    const players = game.players.length > 1 ? [...game.players.slice(1), game.players[0]] : game.players;
    setLastSetup({ mode: game.mode, opts: game.opts, players });
    dispatch({ t: 'start', game: newGame(game.mode, game.opts, players) });
  }

  function exitGame() {
    if (game?.status === 'playing' && game.stats.some((s) => s.darts > 0) && !confirm('Przerwać grę? Wynik nie zostanie zapisany.')) return;
    if (isGuest) {
      leaveGuest();
      return;
    }
    dispatch({ t: 'set', game: null });
    setScreen(host ? 'setup' : 'home');
  }

  function leaveGuest() {
    guestRef.current?.close();
    guestRef.current = null;
    setGuestId('');
    setLobby(null);
    dispatch({ t: 'set', game: null });
    history.replaceState(null, '', location.pathname);
    setScreen('home');
  }

  async function joinRoom(code: string, name: string) {
    setGuestErr(undefined);
    const g = new Guest();
    g.onMessage = (m) => {
      if (m.t === 'welcome') setGuestId(m.you);
      if (m.t === 'lobby') {
        setLobby({ mode: m.mode, opts: m.opts, players: m.players });
        dispatch({ t: 'set', game: null });
        setScreen('join');
      }
      if (m.t === 'game') {
        dispatch({ t: 'set', game: m.game });
        setScreen('game');
      }
      if (m.t === 'closed') {
        setGuestErr(m.reason);
        dispatch({ t: 'set', game: null });
        setScreen('join');
      }
    };
    g.onDisconnect = (reason) => {
      setGuestErr(reason);
      setGuestId('');
      dispatch({ t: 'set', game: null });
      setScreen('join');
    };
    try {
      await g.join(code, name);
      guestRef.current = g;
      setGuestId(g.id);
    } catch (e: any) {
      g.close();
      setGuestErr(e?.message ?? 'Nie udało się połączyć');
    }
  }

  const controls = (p: PlayerInfo) => {
    if (isGuest) return p.owner === guestId;
    if (p.kind === 'remote') return !host?.conns.has(p.owner ?? ''); // rozłączony gość: host może rzucać za niego
    return true;
  };

  if (screen === 'game' && game) {
    return (
      <GameScreen
        game={game}
        controls={controls}
        settings={settings}
        onSettings={setSettings}
        onDart={(d) => (isGuest ? guestRef.current?.send({ t: 'dart', dart: d }) : dispatch({ t: 'dart', dart: d }))}
        onUndo={isGuest ? () => guestRef.current?.send({ t: 'undo' }) : past.length ? () => dispatch({ t: 'undo' }) : undefined}
        onExit={exitGame}
        onRematch={isGuest ? undefined : rematch}
        onlineCode={host?.code}
      />
    );
  }

  if (screen === 'setup') {
    return (
      <Setup
        key={modeId}
        modeId={modeId}
        settings={settings}
        host={host}
        initialPlayers={lastSetup?.players}
        onHost={setHost}
        onBack={() => {
          if (host) {
            host.close();
            setHost(null);
          }
          setLastSetup(null);
          setScreen('home');
        }}
        onStart={start}
      />
    );
  }

  if (screen === 'join') {
    return <Join initialCode={joinParam} name={settings.name} lobby={lobby} connected={isGuest} error={guestErr} onJoin={joinRoom} onBack={leaveGuest} />;
  }

  if (screen === 'stats') return <Stats defaultName={settings.name} onBack={() => setScreen('home')} />;

  return (
    <Home
      settings={settings}
      onSettings={setSettings}
      onPick={(m) => {
        setModeId(m);
        setLastSetup(null);
        setScreen('setup');
      }}
      onJoin={() => setScreen('join')}
      onStats={() => setScreen('stats')}
    />
  );
}
