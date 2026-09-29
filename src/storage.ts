import { gameSummary } from './engine/game';
import type { Game, Opts } from './engine/types';

export type GameRecord = {
  id: string;
  date: number;
  mode: string;
  opts: Opts;
  online?: boolean;
  players: ReturnType<typeof gameSummary>;
};

const HKEY = 'darts.history.v1';
const SKEY = 'darts.settings.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* brak miejsca lub zablokowany storage — pomijamy */
  }
}

export const loadHistory = () => read<GameRecord[]>(HKEY, []);

export function saveGame(g: Game, online = false) {
  // Upsert: po cofnięciu i ponownym zakończeniu gry nadpisujemy wynik.
  const h = loadHistory().filter((r) => r.id !== g.id);
  h.unshift({ id: g.id, date: Date.now(), mode: g.mode, opts: g.opts, online, players: gameSummary(g) });
  write(HKEY, h.slice(0, 1000));
}

export const clearHistory = () => write(HKEY, []);

export interface Settings {
  name: string;
  input: 'board' | 'keys';
}

export const loadSettings = (): Settings => ({ name: 'Ja', input: 'board', ...read<Partial<Settings>>(SKEY, {}) });
export const saveSettings = (s: Settings) => write(SKEY, s);
