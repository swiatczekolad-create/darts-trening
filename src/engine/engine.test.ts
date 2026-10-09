import { describe, expect, it } from 'vitest';
import { D, MISS, S, T, type Dart, BULL } from './board';
import { botThrow, estimateAverage, BOT_LEVELS } from './bot';
import { checkoutRoute } from './checkout';
import { applyDart, newGame } from './game';
import type { Game, PlayerInfo } from './types';

const me: PlayerInfo = { id: 'a', name: 'Ja', kind: 'human' };
const you: PlayerInfo = { id: 'b', name: 'Ty', kind: 'human' };
const play = (g: Game, ds: Dart[]) => ds.reduce(applyDart, g);

describe('Around the Clock+', () => {
  it('3 trafienia z rzędu dają bonusową turę', () => {
    let g = newGame('clock', { skip: 'no' }, [me, you]);
    g = play(g, [S(1), S(2), S(3)]);
    expect(g.cur).toBe(0);
    expect(g.bonus).toBe(1);
    expect(g.msg?.kind).toBe('bonus');
    g = play(g, [S(4), S(5), S(6)]);
    expect(g.cur).toBe(0);
    expect(g.bonus).toBe(2);
    g = play(g, [S(7), MISS, S(8)]);
    expect(g.cur).toBe(1);
    expect(g.ps[0].idx).toBe(8);
    expect(g.stats[0].bonusTurns).toBe(2);
    expect(g.stats[0].turns).toBe(1);
  });

  it('wariant B: double +2, treble +3, nie przeskakuje Bulla', () => {
    let g = newGame('clock', { dir: 'up' }, [me]);
    g = play(g, [D(1), T(3)]);
    expect(g.ps[0].idx).toBe(5); // 1 -> 3 -> 6
    g = newGame('clock', { dir: 'up' }, [me]);
    g.ps[0].idx = 18; // cel 19
    g = applyDart(g, T(19));
    expect(g.ps[0].idx).toBe(20); // Bull
    g = applyDart(g, { seg: 25, mult: 1 });
    expect(g.status).toBe('finished');
  });

  it('bez Bulla treble na 19 kończy grę', () => {
    let g = newGame('clock', { bull: 'no', dir: 'up' }, [me]);
    g.ps[0].idx = 18;
    g = applyDart(g, T(19));
    expect(g.status).toBe('finished');
  });

  it('tam i z powrotem: 1 → 20 → Bull → 20 → 1', () => {
    let g = newGame('clock', {}, [me]);
    g.ps[0].idx = 18; // cel 19
    g = applyDart(g, T(19)); // nie przeskakuje Bulla
    expect(g.ps[0].idx).toBe(20);
    g = applyDart(g, { seg: 25, mult: 1 });
    expect(g.status).toBe('playing');
    g = applyDart(g, S(20)); // w dół: 20
    g = applyDart(g, T(19)); // 19 -> +3 => cel 16
    expect(g.ps[0].idx).toBe(25);
    g.ps[0].idx = 40; // cel 1
    g = applyDart(g, S(1));
    expect(g.status).toBe('finished');
  });

  it('tryb double wymaga double', () => {
    let g = newGame('clock', { target: 'double' }, [me]);
    g = play(g, [S(1), T(1), D(1)]);
    expect(g.ps[0].idx).toBe(1);
  });

  it('wyścig: pierwszy kończący wygrywa', () => {
    let g = newGame('clock', { bull: 'no', dir: 'up' }, [me, you]);
    g.ps[1].idx = 19;
    g = play(g, [MISS, MISS, MISS, S(20)]);
    expect(g.status).toBe('finished');
    expect(g.ranking[0]).toBe(1);
  });
});

describe("Bob's 27", () => {
  it('liczy punkty i odpada przy zerze', () => {
    let g = newGame('bobs27', {}, [me]);
    g = play(g, [D(1), MISS, MISS]); // +2 => 29
    expect(g.ps[0].score).toBe(29);
    g = play(g, [MISS, MISS, MISS]); // -4 => 25
    expect(g.ps[0].score).toBe(25);
    g = play(g, Array(9).fill(MISS)); // -6 -8 -10 => 1
    expect(g.ps[0].score).toBe(1);
    g = play(g, [MISS, MISS, MISS]); // -12
    expect(g.status).toBe('finished');
  });
});

describe('X01', () => {
  it('bust cofa wynik tury', () => {
    let g = newGame('x01', { start: '301' }, [me]);
    g.ps[0] = { rem: 40, ts: 40 };
    g = play(g, [S(20), S(19)]); // zostaje 1 => bust
    expect(g.ps[0].rem).toBe(40);
    expect(g.turn.length).toBe(0);
    g = play(g, [S(20), D(10)]);
    expect(g.status).toBe('finished');
  });
});

describe('Checkout 121', () => {
  it('udany checkout podnosi cel', () => {
    let g = newGame('checkout', { attempts: '5' }, [me]);
    g = play(g, [T(20), T(17), D(5)]);
    expect(g.ps[0].target).toBe(122);
    expect(g.ps[0].success).toBe(1);
  });
  it('9 pudeł = cel bez zmian', () => {
    let g = newGame('checkout', {}, [me]);
    g = play(g, Array(9).fill(MISS));
    expect(g.ps[0].target).toBe(121);
    expect(g.ps[0].attempt).toBe(1);
  });
});

describe('Shanghai', () => {
  it('S+D+T = natychmiastowa wygrana', () => {
    let g = newGame('shanghai', {}, [me, you]);
    g = play(g, [S(1), D(1), T(1)]);
    expect(g.status).toBe('finished');
    expect(g.ranking[0]).toBe(0);
  });
});

describe('Cricket', () => {
  it('punkty za nadwyżkę na otwartym u rywala', () => {
    let g = newGame('cricket', {}, [me, you]);
    g = play(g, [T(20), T(20)]);
    expect(g.ps[0].pts).toBe(60);
  });
});

describe('checkout i bot', () => {
  it('podpowiada klasyczne zamknięcia', () => {
    expect(checkoutRoute(170, 3)).toEqual([T(20), T(20), BULL]);
    expect(checkoutRoute(40, 1)).toEqual([D(20)]);
    expect(checkoutRoute(169, 3)).toBeNull();
    expect(checkoutRoute(100, 2)?.length).toBe(2);
  });
  it('lepszy bot ma wyższą średnią', () => {
    const avgs = BOT_LEVELS.map((b) => estimateAverage(b.level));
    for (let i = 1; i < avgs.length; i++) expect(avgs[i]).toBeGreaterThan(avgs[i - 1]);
    console.log(BOT_LEVELS.map((b, i) => `${b.name}: ${avgs[i].toFixed(1)}`).join(', '));
    expect(botThrow(T(20), 7).seg).toBeTypeOf('number');
  });
});
