// Gra online bez własnego serwera: połączenie peer-to-peer (WebRTC) przez darmowy broker PeerJS.
// Host trzyma stan gry i rozsyła go gościom. Goście wysyłają tylko swoje lotki.
import Peer, { type DataConnection } from 'peerjs';
import type { Dart } from '../engine/board';
import type { Game, Opts, PlayerInfo } from '../engine/types';

const PREFIX = 'darts-trening-pl-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const makeCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export type HostMsg =
  | { t: 'welcome'; you: string }
  | { t: 'lobby'; mode: string; opts: Opts; players: PlayerInfo[] }
  | { t: 'game'; game: Game }
  | { t: 'closed'; reason: string };

export type GuestMsg = { t: 'hello'; name: string } | { t: 'dart'; dart: Dart } | { t: 'undo' };

export class Host {
  peer: Peer | null = null;
  code = '';
  conns = new Map<string, DataConnection>();
  onGuestJoin: (id: string, name: string) => void = () => {};
  onGuestLeave: (id: string) => void = () => {};
  onAction: (id: string, msg: GuestMsg) => void = () => {};
  last: HostMsg[] = [];

  open(): Promise<string> {
    return new Promise((resolve, reject) => {
      const tryOpen = (attempt: number) => {
        const code = makeCode();
        const peer = new Peer(PREFIX + code);
        peer.on('open', () => {
          this.peer = peer;
          this.code = code;
          resolve(code);
        });
        peer.on('error', (err: any) => {
          if (err?.type === 'unavailable-id' && attempt < 3) {
            peer.destroy();
            tryOpen(attempt + 1);
          } else if (!this.peer) reject(err);
        });
        peer.on('connection', (conn) => this.accept(conn));
      };
      tryOpen(0);
    });
  }

  private accept(conn: DataConnection) {
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
      conn.send({ t: 'welcome', you: conn.peer } satisfies HostMsg);
      for (const m of this.last) conn.send(m);
    });
    conn.on('data', (raw) => {
      const msg = raw as GuestMsg;
      if (msg.t === 'hello') this.onGuestJoin(conn.peer, String(msg.name).slice(0, 20) || 'Gość');
      else this.onAction(conn.peer, msg);
    });
    const leave = () => {
      if (this.conns.delete(conn.peer)) this.onGuestLeave(conn.peer);
    };
    conn.on('close', leave);
    conn.on('error', leave);
  }

  broadcast(msg: HostMsg) {
    // Zapamiętujemy ostatni lobby/stan gry dla graczy, którzy dołączą lub połączą się ponownie.
    if (msg.t !== 'closed') this.last = [msg];
    for (const c of this.conns.values()) if (c.open) c.send(msg);
  }

  close() {
    this.broadcast({ t: 'closed', reason: 'Host zakończył grę' });
    setTimeout(() => this.peer?.destroy(), 300);
  }
}

export class Guest {
  peer: Peer | null = null;
  conn: DataConnection | null = null;
  id = '';
  onMessage: (m: HostMsg) => void = () => {};
  onDisconnect: (reason: string) => void = () => {};

  join(code: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;
      const timer = setTimeout(() => reject(new Error('Brak odpowiedzi. Sprawdź kod pokoju.')), 12000);
      peer.on('open', (id) => {
        this.id = id;
        const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true });
        this.conn = conn;
        conn.on('open', () => {
          clearTimeout(timer);
          conn.send({ t: 'hello', name } satisfies GuestMsg);
          resolve();
        });
        conn.on('data', (m) => this.onMessage(m as HostMsg));
        conn.on('close', () => this.onDisconnect('Rozłączono z hostem'));
      });
      peer.on('error', (err: any) => {
        clearTimeout(timer);
        const msg = err?.type === 'peer-unavailable' ? 'Nie ma pokoju o takim kodzie.' : 'Błąd połączenia: ' + (err?.type ?? err);
        if (!this.conn?.open) reject(new Error(msg));
        else this.onDisconnect(msg);
      });
    });
  }

  send(m: GuestMsg) {
    if (this.conn?.open) this.conn.send(m);
  }

  close() {
    this.peer?.destroy();
  }
}
