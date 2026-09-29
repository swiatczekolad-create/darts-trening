import { useState } from 'react';
import type { Dart, Mult } from '../engine/board';

interface Props {
  disabled?: boolean;
  onDart: (d: Dart) => void;
}

export function Keypad({ disabled, onDart }: Props) {
  const [mult, setMult] = useState<Mult>(1);
  const send = (d: Dart) => {
    navigator.vibrate?.(12);
    onDart(d);
    setMult(1);
  };
  return (
    <div className={`keypad ${disabled ? 'is-disabled' : ''}`}>
      <div className="mults">
        {([1, 2, 3] as Mult[]).map((m) => (
          <button key={m} className={`mult m${m} ${mult === m ? 'on' : ''}`} onClick={() => setMult(mult === m ? 1 : m)} disabled={disabled}>
            {m === 1 ? 'Single' : m === 2 ? 'Double' : 'Treble'}
          </button>
        ))}
      </div>
      <div className="nums">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => send({ seg: n, mult })} disabled={disabled}>
            {mult === 2 ? 'D' : mult === 3 ? 'T' : ''}
            {n}
          </button>
        ))}
        <button onClick={() => send({ seg: 25, mult: 1 })} disabled={disabled || mult === 3}>
          25
        </button>
        <button onClick={() => send({ seg: 25, mult: 2 })} disabled={disabled || mult === 3}>
          Bull
        </button>
        <button className="miss" onClick={() => send({ seg: 0, mult: 0 })} disabled={disabled}>
          Pudło
        </button>
      </div>
    </div>
  );
}
