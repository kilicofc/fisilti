import type { WebSocket } from 'ws';
import { store } from './store.ts';

export function sendToSession(sessionId: string, event: string, payload: unknown): void {
  const sockets = store.wsClients.get(sessionId);
  if (!sockets || sockets.size === 0) return;
  const serialized = JSON.stringify({ event, payload });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(serialized);
    }
  }
}

export function getActiveUserCount(): number {
  let count = 0;
  for (const [sessionId, sockets] of store.wsClients.entries()) {
    const hasOpen = Array.from(sockets).some((ws) => ws.readyState === ws.OPEN);
    if (!hasOpen) continue;
    const session = store.sessions.get(sessionId);
    if (
      session &&
      session.status !== 'permanently_banned' &&
      session.status !== 'underage_terminated'
    ) {
      count += 1;
    }
  }
  return count;
}

export function broadcastActiveCount(): void {
  const count = getActiveUserCount();
  const serialized = JSON.stringify({
    event: 'presence:count',
    payload: { activeUsers: count },
  });
  for (const sockets of store.wsClients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(serialized);
      }
    }
  }
  broadcastToAdmins('admin:metrics_tick', {
    activeUsers: count,
    activeRooms: Array.from(store.rooms.values()).filter((r) => !r.closed).length,
    queueSize: store.waitingQueue.length,
  });
}

export function broadcastToAdmins(event: string, payload: unknown): void {
  if (store.adminWsClients.size === 0) return;
  const serialized = JSON.stringify({ event, payload });
  for (const ws of store.adminWsClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(serialized);
    }
  }
}

export function attachUserSocket(sessionId: string, ws: WebSocket): void {
  let set = store.wsClients.get(sessionId);
  if (!set) {
    set = new Set();
    store.wsClients.set(sessionId, set);
  }
  set.add(ws);
}

export function detachUserSocket(sessionId: string, ws: WebSocket): boolean {
  const set = store.wsClients.get(sessionId);
  if (!set) return true;
  set.delete(ws);
  if (set.size === 0) {
    store.wsClients.delete(sessionId);
    return true;
  }
  return false;
}
