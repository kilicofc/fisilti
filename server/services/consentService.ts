import crypto from 'node:crypto';
import { config } from '../config.ts';
import type { ConsentRecord, SessionState } from '../types.ts';
import {
  generateAnonymousAlias,
  generateAvatarSeed,
  sanitizeNickname,
} from './safetyFilter.ts';
import { store } from './store.ts';

export interface ConsentInput {
  sessionId?: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cookieAccepted: boolean;
  userAgent?: string;
  ip: string;
}

export function isIpBanned(ipHash: string): { banned: boolean; reason?: string } {
  const entry = store.bannedIpHashes.get(ipHash);
  if (!entry) return { banned: false };
  if (!entry.permanent && Date.now() >= entry.expiresAt) {
    store.bannedIpHashes.delete(ipHash);
    return { banned: false };
  }
  return { banned: true, reason: entry.reason };
}

export function isSessionBanned(session: SessionState): {
  banned: boolean;
  reason?: string;
  banUntil?: number | null;
} {
  if (session.status === 'underage_terminated') {
    return {
      banned: true,
      reason:
        '18 yaş altı kullanım tespiti nedeniyle oturumunuz kalıcı olarak kapatılmıştır.',
    };
  }
  if (session.status === 'permanently_banned') {
    return {
      banned: true,
      reason:
        session.banReason ||
        'Topluluk kurallarının ihlali nedeniyle erişiminiz kalıcı olarak durdurulmuştur.',
    };
  }
  if (session.status === 'temp_banned') {
    if (session.banUntil !== null && Date.now() < session.banUntil) {
      return {
        banned: true,
        reason:
          session.banReason ||
          'Çoklu şikayet veya güvenlik ihlali nedeniyle geçici kısıtlama uygulanmıştır.',
        banUntil: session.banUntil,
      };
    }
    session.status = 'active';
    session.banUntil = null;
    session.banReason = null;
  }
  return { banned: false };
}

export function recordConsent(input: ConsentInput): {
  ok: boolean;
  error?: string;
  session?: SessionState;
  consent?: ConsentRecord;
} {
  if (
    !input.ageConfirmed ||
    !input.termsAccepted ||
    !input.privacyAccepted ||
    !input.cookieAccepted
  ) {
    return {
      ok: false,
      error:
        'Devam edebilmek için 18 yaş onayı, Kullanım Koşulları, Gizlilik/KVKK metni ve çerez onayını işaretlemelisiniz.',
    };
  }

  const ipHash = store.hashIp(input.ip);
  const ipCheck = isIpBanned(ipHash);
  if (ipCheck.banned) {
    return {
      ok: false,
      error: ipCheck.reason || 'Güvenlik politikası gereği erişiminiz kısıtlanmıştır.',
    };
  }

  const now = Date.now();
  const nextReset = now + 24 * 3600_000;
  let session =
    input.sessionId && store.sessions.has(input.sessionId)
      ? store.sessions.get(input.sessionId)!
      : undefined;

  if (session) {
    const banCheck = isSessionBanned(session);
    if (banCheck.banned) {
      return { ok: false, error: banCheck.reason };
    }
  } else {
    const newId = `usr_${crypto.randomBytes(12).toString('hex')}`;
    session = {
      sessionId: newId,
      displayName: generateAnonymousAlias(),
      customNickname: null,
      avatarSeed: generateAvatarSeed(),
      interests: [],
      consent: null,
      ipHash,
      lastPartnerId: null,
      blockedSessionIds: new Set<string>(),
      dailyMatchCount: 0,
      dailyMatchResetAt: nextReset,
      reportStrikes: 0,
      safetyWarnings: 0,
      messageTimestamps: [],
      status: 'active',
      banUntil: null,
      banReason: null,
      pendingNotifications: [],
      createdAt: now,
      lastActiveAt: now,
    };
    store.sessions.set(newId, session);
  }

  const consent: ConsentRecord = {
    sessionId: session.sessionId,
    ageConfirmed: true,
    termsAccepted: true,
    privacyAccepted: true,
    cookieAccepted: true,
    acceptedAt: new Date(now).toISOString(),
    userAgentSummary: (input.userAgent || 'Bilinmiyor').slice(0, 80),
  };

  session.consent = consent;
  session.lastActiveAt = now;
  store.consents.push(consent);

  return { ok: true, session, consent };
}

export function updatePreferences(
  sessionId: string,
  nickname: string | null | undefined,
  interests: string[],
): { ok: boolean; error?: string; customNickname?: string | null; interests?: string[] } {
  const session = store.sessions.get(sessionId);
  if (!session || !session.consent) {
    return { ok: false, error: 'Önce onay adımlarını tamamlamalısınız.' };
  }

  const cleanInterests = Array.from(
    new Set(
      interests
        .filter((i) => typeof i === 'string')
        .map((i) => i.trim().slice(0, 28))
        .filter(Boolean),
    ),
  ).slice(0, 6);

  let cleanNick: string | null = null;
  if (nickname && nickname.trim().length > 0) {
    cleanNick = sanitizeNickname(nickname);
    if (!cleanNick) {
      return {
        ok: false,
        error:
          'Takma ad kişisel bilgi (telefon, e-posta, sosyal medya) veya uygunsuz ifade içeremez (en az 2 karakter).',
      };
    }
  }

  session.customNickname = cleanNick;
  session.interests = cleanInterests;
  session.lastActiveAt = Date.now();
  return { ok: true, customNickname: cleanNick, interests: cleanInterests };
}

export function deleteSessionData(sessionId: string): { ok: boolean } {
  const session = store.sessions.get(sessionId);
  if (!session) {
    return { ok: true };
  }

  // Remove user from queue
  store.waitingQueue = store.waitingQueue.filter((q) => q.sessionId !== sessionId);

  // Anonymize or remove consent entries for KVKK right to erasure unless session is permanently banned for safety
  if (session.status === 'active') {
    store.consents = store.consents.filter((c) => c.sessionId !== sessionId);
    store.sessions.delete(sessionId);
  } else {
    session.customNickname = null;
    session.interests = [];
    session.blockedSessionIds.clear();
  }

  return { ok: true };
}

export function checkDailyMatchQuota(session: SessionState): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  if (now >= session.dailyMatchResetAt) {
    session.dailyMatchCount = 0;
    session.dailyMatchResetAt = now + 24 * 3600_000;
  }
  const remaining = Math.max(0, config.dailyMatchLimit - session.dailyMatchCount);
  return {
    allowed: session.dailyMatchCount < config.dailyMatchLimit,
    remaining,
  };
}
