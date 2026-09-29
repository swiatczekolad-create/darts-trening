import { MODES } from '../engine/modes';

export function RulesSheet({ modeId, onClose }: { modeId: string; onClose: () => void }) {
  const mode = MODES[modeId];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{mode.name}</h2>
        <p className="muted">{mode.tagline}</p>
        <ul className="rules">
          {mode.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <button className="btn primary block" onClick={onClose}>
          Rozumiem
        </button>
      </div>
    </div>
  );
}
