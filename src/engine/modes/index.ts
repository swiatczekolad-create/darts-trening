import type { ModeDef } from '../types';
import { bobs27 } from './bobs27';
import { clock } from './clock';
import { cricket } from './cricket';
import { halveit } from './halveit';
import { checkout, x01 } from './match';
import { scoring } from './scoring';
import { shanghai } from './shanghai';

export const MODE_LIST: ModeDef[] = [clock, bobs27, shanghai, halveit, scoring, checkout, x01, cricket];

export const MODES: Record<string, ModeDef> = Object.fromEntries(MODE_LIST.map((m) => [m.id, m]));
