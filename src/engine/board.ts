// Geometria tarczy (mm, wymiary regulaminowe). Układ współrzędnych matematyczny: y w górę, 20 na górze.

export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const R = {
  bull: 6.35,
  outerBull: 15.9,
  tIn: 99,
  tOut: 107,
  dIn: 162,
  dOut: 170,
};

export type Mult = 0 | 1 | 2 | 3;

/** seg: 1–20 lub 25 (bull), 0 = pudło. mult: 0 pudło, 1 single, 2 double (dla 25 = bull 50), 3 treble. */
export interface Dart {
  seg: number;
  mult: Mult;
  /** Miejsce wbicia na tarczy (mm), jeśli znane. */
  x?: number;
  y?: number;
}

export const MISS: Dart = { seg: 0, mult: 0 };

export const dartScore = (d: Dart) => (d.mult === 0 ? 0 : d.seg * d.mult);

export function dartLabel(d: Dart): string {
  if (d.mult === 0) return 'Pudło';
  if (d.seg === 25) return d.mult === 2 ? 'Bull' : '25';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : '') + d.seg;
}

/** Kąt środka segmentu w stopniach, zgodnie z ruchem wskazówek zegara od góry. */
export const segAngle = (seg: number) => ORDER.indexOf(seg) * 18;

export function polar(r: number, angDeg: number): [number, number] {
  const a = (angDeg * Math.PI) / 180;
  return [r * Math.sin(a), r * Math.cos(a)];
}

export function hitTest(x: number, y: number): Dart {
  const r = Math.hypot(x, y);
  if (r > R.dOut) return { seg: 0, mult: 0, x, y };
  if (r <= R.bull) return { seg: 25, mult: 2, x, y };
  if (r <= R.outerBull) return { seg: 25, mult: 1, x, y };
  let theta = (Math.atan2(x, y) * 180) / Math.PI;
  if (theta < 0) theta += 360;
  const seg = ORDER[Math.floor(((theta + 9) % 360) / 18)];
  const mult: Mult = r >= R.dIn ? 2 : r >= R.tIn && r <= R.tOut ? 3 : 1;
  return { seg, mult, x, y };
}

/** Punkt, w który celuje się, rzucając w dane pole. */
export function aimPoint(d: Dart): [number, number] {
  if (d.mult === 0) return [0, 0];
  if (d.seg === 25) return d.mult === 2 ? [0, 0] : [0, 11];
  const r = d.mult === 3 ? (R.tIn + R.tOut) / 2 : d.mult === 2 ? (R.dIn + R.dOut) / 2 : 58;
  return polar(r, segAngle(d.seg));
}

export const D = (seg: number): Dart => ({ seg, mult: 2 });
export const T = (seg: number): Dart => ({ seg, mult: 3 });
export const S = (seg: number): Dart => ({ seg, mult: 1 });
export const BULL: Dart = { seg: 25, mult: 2 };
