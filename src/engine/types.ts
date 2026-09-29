import type { Dart } from './board';

export type PlayerKind = 'human' | 'bot' | 'remote';

export interface PlayerInfo {
  id: string;
  name: string;
  kind: PlayerKind;
  /** Poziom bota (1–7). */
  level?: number;
  /** Id urządzenia, które steruje graczem w grze online ('host' dla lokalnych). */
  owner?: string;
}

export interface ThrownDart extends Dart {
  /** Czy lotka trafiła w cel treningowy (null = nie dotyczy). */
  hit?: boolean | null;
}

export interface PStats {
  darts: number;
  hits: number;
  /** Lotki, dla których liczy się trafienie/pudło. */
  judged: number;
  turns: number;
  bonusTurns: number;
  /** Skuteczność na poszczególnych polach: etykieta -> [trafienia, próby]. */
  byTarget: Record<string, [number, number]>;
}

export interface TurnRec {
  p: number;
  darts: ThrownDart[];
  bonus?: boolean;
  note?: string;
}

export type MsgKind = 'bonus' | 'bust' | 'win' | 'info' | 'bad';

export interface Msg {
  text: string;
  kind: MsgKind;
}

export type Opts = Record<string, string>;

export interface Game {
  id: string;
  mode: string;
  opts: Opts;
  players: PlayerInfo[];
  /** Stan gracza specyficzny dla trybu. */
  ps: any[];
  stats: PStats[];
  done: boolean[];
  cur: number;
  /** Lotki bieżącej tury. */
  turn: ThrownDart[];
  /** Ile bonusowych tur z rzędu gra aktualny gracz. */
  bonus: number;
  status: 'playing' | 'finished';
  ranking: number[];
  history: TurnRec[];
  msg?: Msg & { id: number };
  startedAt: number;
}

export interface DartOutcome<S = any> {
  ps: S;
  hit?: boolean | null;
  /** Etykieta celu, w który rzucał gracz (do statystyk skuteczności). */
  tk?: string;
  endTurn?: boolean;
  /** Gracz zakończył swoją grę. */
  finished?: boolean;
  msg?: Msg;
}

export interface TurnOutcome<S = any> {
  ps?: S;
  bonus?: boolean;
  done?: boolean;
  winNow?: boolean;
  msg?: Msg;
}

export interface OptionSpec {
  key: string;
  label: string;
  choices: { v: string; l: string }[];
  def: string;
  hint?: string;
  showIf?: (o: Opts) => boolean;
}

/** Podświetlenie na tarczy: segment + pierścień. */
export interface Highlight {
  seg: number;
  ring: 'all' | 'S' | 'D' | 'T' | 'bull' | 'dbull';
}

export interface ModeView {
  big: string;
  bigLabel: string;
  sub?: string;
  hint?: string;
  scoreLine: string;
  targets?: Highlight[];
}

export interface Metric {
  value: number;
  label: string;
  unit?: string;
  lowerBetter?: boolean;
  decimals?: number;
}

export interface ModeDef<S = any> {
  id: string;
  name: string;
  category: 'Celność' | 'Double' | 'Scoring' | 'Mecz';
  tagline: string;
  rules: string[];
  options: OptionSpec[];
  /** Kto pierwszy skończy, wygrywa (gra kończy się natychmiast). */
  race?: boolean;
  maxTurns?: (o: Opts) => number | undefined;
  init(o: Opts): S;
  dart(g: Game, p: number, d: Dart): DartOutcome<S>;
  endTurn?(g: Game, p: number): TurnOutcome<S>;
  aim(g: Game, p: number, level: number): Dart;
  view(g: Game, p: number): ModeView;
  /** Klucz rankingu (wyżej = lepiej). */
  key(g: Game, p: number): number;
  /** Główna miara do statystyk. */
  metric(g: Game, p: number): Metric | null;
}
