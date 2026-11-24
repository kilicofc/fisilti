import { config } from '../config.ts';
import type { ChatRoom, SessionState } from '../types.ts';
import { checkDailyMatchQuota, isSessionBanned } from './consentService.ts';
import {
  broadcastActiveCount,
  sendToSession,
} from './realtimeBus.ts';
import {
  generateAnonymousAlias,
  generateAvatarSeed,
  sanitizeNickname,
} from './safetyFilter.ts';
import { store } from './store.ts';

const FALLBACK_WAIT_MS = 3500;

export function findActiveRoomForSession(sessionId: string): ChatRoom | undefined {
  for (const room of store.rooms.values()) {
    if (!room.closed && room.participants.includes(sessionId)) {
      return room;
    }
  }
  return undefined;
}

export function leaveQueue(sessionId: string): void {
  const before = store.waitingQueue.length;
  store.waitingQueue = store.waitingQueue.filter((q) => q.sessionId !== sessionId);
  if (store.waitingQueue.length !== before) {
    sendToSession(sessionId, 'match:cancelled', {});
    broadcastActiveCount();
  }
}

export function closeRoom(
  roomId: string,
  endedBySessionId: string | null,
  reason: 'ended' | 'blocked' | 'disconnected' | 'banned',
): void {
  const room = store.rooms.get(roomId);
  if (!room || room.closed) return;

  room.closed = true;

  for (const participantId of room.participants) {
    if (reason === 'blocked' && participantId !== endedBySessionId) {
      // Silent block: never inform the other party they were blocked
      sendToSession(participantId, 'chat:ended', {
        roomId,
        reason: 'partner_left',
      });
    } else if (reason === 'banned') {
      sendToSession(participantId, 'chat:ended', {
        roomId,
        reason:
          participantId === endedBySessionId ? 'session_restricted' : 'partner_left',
      });
    } else if (participantId === endedBySessionId) {
      sendToSession(participantId, 'chat:ended', {
        roomId,
        reason: 'self_left',
      });
    } else {
      sendToSession(participantId, 'chat:ended', {
        roomId,
        reason: 'partner_left',
      });
    }
  }

  // Wipe messages immediately from memory unless the room was reported
  if (!room.reported) {
    room.messages = [];
    store.rooms.delete(roomId);
  }
  broadcastActiveCount();
}

function areCompatible(a: SessionState, b: SessionState): boolean {
  if (a.sessionId === b.sessionId) return false;
  if (a.lastPartnerId === b.sessionId || b.lastPartnerId === a.sessionId) {
    return false;
  }
  if (
    a.blockedSessionIds.has(b.sessionId) ||
    b.blockedSessionIds.has(a.sessionId)
  ) {
    return false;
  }
  if (isSessionBanned(a).banned || isSessionBanned(b).banned) return false;
  return true;
}

function computeSharedInterests(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLocaleLowerCase('tr-TR')));
  return a.filter((x) => setB.has(x.toLocaleLowerCase('tr-TR')));
}

function createRoomPair(a: SessionState, b: SessionState, shared: string[]): ChatRoom {
  const roomId = store.generateId('room');

  // Fresh anonymous alias and geometric avatar seed per match (unless user chose a safe nickname)
  const aliasA = a.customNickname || generateAnonymousAlias();
  const aliasB = b.customNickname || generateAnonymousAlias();
  const avatarA = generateAvatarSeed();
  const avatarB = generateAvatarSeed();

  a.displayName = aliasA;
  b.displayName = aliasB;
  a.avatarSeed = avatarA;
  b.avatarSeed = avatarB;
  a.lastPartnerId = b.sessionId;
  b.lastPartnerId = a.sessionId;
  a.dailyMatchCount += 1;
  b.dailyMatchCount += 1;
  a.lastActiveAt = Date.now();
  b.lastActiveAt = Date.now();

  const room: ChatRoom = {
    roomId,
    participants: [a.sessionId, b.sessionId],
    participantAliases: {
      [a.sessionId]: aliasA,
      [b.sessionId]: aliasB,
    },
    participantAvatars: {
      [a.sessionId]: avatarA,
      [b.sessionId]: avatarB,
    },
    sharedInterests: shared,
    createdAt: Date.now(),
    messages: [],
    reported: false,
    closed: false,
  };

  store.rooms.set(roomId, room);

  sendToSession(a.sessionId, 'match:found', {
    roomId,
    selfAlias: aliasA,
    selfAvatarSeed: avatarA,
    partnerAlias: aliasB,
    partnerAvatarSeed: avatarB,
    sharedInterests: shared,
    dailyRemaining: Math.max(0, config.dailyMatchLimit - a.dailyMatchCount),
  });

  sendToSession(b.sessionId, 'match:found', {
    roomId,
    selfAlias: aliasB,
    selfAvatarSeed: avatarB,
    partnerAlias: aliasA,
    partnerAvatarSeed: avatarA,
    sharedInterests: shared,
    dailyRemaining: Math.max(0, config.dailyMatchLimit - b.dailyMatchCount),
  });

  broadcastActiveCount();
  return room;
}

export function tryPairFromQueue(): boolean {
  if (store.waitingQueue.length < 2) return false;
  const now = Date.now();

  let bestPair: { i: number; j: number; shared: string[]; score: number } | null =
    null;

  for (let i = 0; i < store.waitingQueue.length; i++) {
    const entryA = store.waitingQueue[i];
    const sessionA = store.sessions.get(entryA.sessionId);
    if (!sessionA) continue;

    for (let j = i + 1; j < store.waitingQueue.length; j++) {
      const entryB = store.waitingQueue[j];
      const sessionB = store.sessions.get(entryB.sessionId);
      if (!sessionB) continue;

      if (!areCompatible(sessionA, sessionB)) continue;

      const shared = computeSharedInterests(sessionA.interests, sessionB.interests);
      const bothReadyForFallback =
        now - entryA.joinedAt >= FALLBACK_WAIT_MS ||
        now - entryB.joinedAt >= FALLBACK_WAIT_MS ||
        (sessionA.interests.length === 0 && sessionB.interests.length === 0);

      if (shared.length === 0 && !bothReadyForFallback) {
        continue;
      }

      const score = shared.length * 100 + (now - entryA.joinedAt) / 1000;
      if (!bestPair || score > bestPair.score) {
        bestPair = { i, j, shared, score };
      }
    }
  }

  if (!bestPair) return false;

  const [entryA, entryB] = [
    store.waitingQueue[bestPair.i],
    store.waitingQueue[bestPair.j],
  ];
  const sessionA = store.sessions.get(entryA.sessionId);
  const sessionB = store.sessions.get(entryB.sessionId);

  store.waitingQueue = store.waitingQueue.filter(
    (q) => q.sessionId !== entryA.sessionId && q.sessionId !== entryB.sessionId,
  );

  if (!sessionA || !sessionB) return false;

  createRoomPair(sessionA, sessionB, bestPair.shared);
  return true;
}

export function joinMatchQueue(
  sessionId: string,
  interests: string[],
  customNickname?: string | null,
): { ok: boolean; error?: string; matched?: boolean } {
  const session = store.sessions.get(sessionId);
  if (!session || !session.consent) {
    return {
      ok: false,
      error: 'Eşleşmeye başlamadan önce tüm yasal onayları vermelisiniz.',
    };
  }

  const ban = isSessionBanned(session);
  if (ban.banned) {
    return { ok: false, error: ban.reason };
  }

  const quota = checkDailyMatchQuota(session);
  if (!quota.allowed) {
    return {
      ok: false,
      error: `Günlük eşleşme limitinize (${config.dailyMatchLimit}) ulaştınız. Güvenlik amacıyla yarın tekrar deneyebilirsiniz.`,
    };
  }

  // Close existing active room if user triggers "Yeni Eşleşme"
  const existingRoom = findActiveRoomForSession(sessionId);
  if (existingRoom) {
    closeRoom(existingRoom.roomId, sessionId, 'ended');
  }

  session.interests = Array.from(
    new Set(
      interests
        .filter((i) => typeof i === 'string')
        .map((i) => i.trim().slice(0, 28))
        .filter(Boolean),
    ),
  ).slice(0, 6);

  if (customNickname && customNickname.trim().length > 0) {
    const clean = sanitizeNickname(customNickname);
    if (!clean) {
      return {
        ok: false,
        error:
          'Seçtiğiniz takma ad kişisel bilgi veya uygunsuz ifade içeremez.',
      };
    }
    session.customNickname = clean;
  } else {
    session.customNickname = null;
  }

  session.lastActiveAt = Date.now();

  if (!store.waitingQueue.some((q) => q.sessionId === sessionId)) {
    store.waitingQueue.push({ sessionId, joinedAt: Date.now() });
  }

  sendToSession(sessionId, 'match:waiting', {
    interests: session.interests,
    dailyRemaining: quota.remaining,
  });

  const matched = tryPairFromQueue();
  return { ok: true, matched };
}

let fallbackSweepStarted = false;
export function startMatchingSweep(): void {
  if (fallbackSweepStarted) return;
  fallbackSweepStarted = true;
  const interval = setInterval(() => {
    while (tryPairFromQueue()) {
      // Pair all eligible users whose fallback wait has elapsed
    }
  }, 1500);
  interval.unref();
}
