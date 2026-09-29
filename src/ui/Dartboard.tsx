import { memo, useMemo, useRef } from 'react';
import { aimPoint, hitTest, ORDER, polar, R, type Dart } from '../engine/board';
import type { Highlight } from '../engine/types';

// Współrzędne SVG: y w dół, więc odwracamy y z modelu tarczy.
const pt = (r: number, a: number) => {
  const [x, y] = polar(r, a);
  return `${x.toFixed(2)} ${(-y).toFixed(2)}`;
};

function sector(r0: number, r1: number, a0: number, a1: number) {
  return `M${pt(r1, a0)} A${r1} ${r1} 0 0 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0} ${r0} 0 0 0 ${pt(r0, a0)} Z`;
}

const RINGS: Record<'S1' | 'T' | 'S2' | 'D', [number, number]> = {
  S1: [R.outerBull, R.tIn],
  T: [R.tIn, R.tOut],
  S2: [R.tOut, R.dIn],
  D: [R.dIn, R.dOut],
};

function hlPaths(h: Highlight): string[] {
  if (h.seg === 25) return [];
  const a = ORDER.indexOf(h.seg) * 18;
  const [a0, a1] = [a - 9, a + 9];
  if (h.ring === 'all') return [sector(R.outerBull, R.dOut, a0, a1)];
  if (h.ring === 'S') return [sector(...RINGS.S1, a0, a1), sector(...RINGS.S2, a0, a1)];
  if (h.ring === 'T') return [sector(...RINGS.T, a0, a1)];
  if (h.ring === 'D') return [sector(...RINGS.D, a0, a1)];
  return [];
}

const Static = memo(function Static() {
  return (
    <g>
      <circle r={200} fill="var(--board-surround)" />
      {ORDER.map((seg, i) => {
        const a = i * 18;
        const dark = i % 2 === 0;
        const single = dark ? 'var(--b-black)' : 'var(--b-cream)';
        const ring = dark ? 'var(--b-red)' : 'var(--b-green)';
        return (
          <g key={seg}>
            <path d={sector(...RINGS.S1, a - 9, a + 9)} fill={single} />
            <path d={sector(...RINGS.T, a - 9, a + 9)} fill={ring} />
            <path d={sector(...RINGS.S2, a - 9, a + 9)} fill={single} />
            <path d={sector(...RINGS.D, a - 9, a + 9)} fill={ring} />
          </g>
        );
      })}
      <circle r={R.outerBull} fill="var(--b-green)" />
      <circle r={R.bull} fill="var(--b-red)" />
      {ORDER.map((seg, i) => {
        const [x, y] = polar(185, i * 18);
        return (
          <text key={seg} x={x} y={-y} className="board-num" textAnchor="middle" dominantBaseline="central">
            {seg}
          </text>
        );
      })}
    </g>
  );
});

interface Props {
  targets?: Highlight[];
  marks?: Dart[];
  disabled?: boolean;
  onDart?: (d: Dart) => void;
}

export function Dartboard({ targets = [], marks = [], disabled, onDart }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  const hlEls = useMemo(
    () =>
      targets.flatMap((h, i) => {
        if (h.seg === 25) {
          return [<circle key={`b${i}`} r={h.ring === 'dbull' ? R.bull : R.outerBull} className="hl" />];
        }
        return hlPaths(h).map((d, j) => <path key={`${i}-${j}`} d={d} className="hl" />);
      }),
    [targets]
  );

  function click(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled || !onDart || !ref.current) return;
    const p = ref.current.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = ref.current.getScreenCTM();
    if (!m) return;
    const q = p.matrixTransform(m.inverse());
    const d = hitTest(q.x, -q.y);
    navigator.vibrate?.(12);
    onDart(d);
  }

  return (
    <svg ref={ref} className={`board ${disabled ? 'is-disabled' : ''}`} viewBox="-200 -200 400 400" onPointerUp={click} role="img" aria-label="Tarcza do darta — dotknij, aby wpisać rzut">
      <Static />
      {hlEls}
      {marks.map((d, i) => {
        if (d.mult === 0) return null;
        const [x, y] = d.x != null && d.y != null ? [d.x, d.y] : aimPoint(d);
        return (
          <g key={i} className="mark" transform={`translate(${x} ${-y})`}>
            <circle r={6.5} />
            <text textAnchor="middle" dominantBaseline="central">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
