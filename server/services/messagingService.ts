import { config } from '../config.ts';
import type { ChatMessageRecord } from '../types.ts';
import { isSessionBanned } from './consentService.ts';
import { closeRoom, findActiveRoomForSession } from './matchingService.ts';
import { broadcastToAdmins, sendToSession } from './realtimeBus.ts';
import { evaluateMessageSafety } from './safetyFilter.ts';
import { store } from './store.ts';

export function handleIncomingMessage(
  sessionId: string,
  roomId: string,
  rawText: unknown,
  hasAttachmentFlag?: boolean,
): void {
  const session = store.sessions.get(sessionId);
  if (!session) return;

  const ban = isSessionBanned(session);
  if (ban.banned) {
    sendToSession(sessionId, 'session:terminated', {
      reason: ban.reason || 'Erişiminiz kısıtlanmıştır.',
    });
    return;
  }

  if (hasAttachmentFlag) {
    sendToSession(sessionId, 'chat:system_warning', {
      message: 'İlk sürümde yalnızca metin mesajları desteklenmektedir. Görsel ve dosya gönderimi kapalıdır.',
    });
    return;
  }

  if (typeof rawText !== 'string') {
    sendToSession(sessionId, 'chat:system_warning', {
      message: 'Yalnızca metin mesajı gönderebilirsiniz.',
    });
    return;
  }

  const trimmed = rawText.trim();
  if (!trimmed) return;
  if (trimmed.length > 1000) {
    sendToSession(sessionId, 'chat:system_warning', {
      message: 'Mesajınız tek seferde en fazla 1000 karakter olabilir.',
    });
    return;
  }

  // Block inline data-uri / base64 image payloads disguised as text
  if (/^data:(?:image|video|audio|application)\//i.test(trimmed)) {
    sendToSession(sessionId, 'chat:system_warning', {
      message: 'Görsel veya dosya içeriği gönderimi desteklenmemektedir.',
    });
    return;
  }

  const room = store.rooms.get(roomId);
  if (!room || room.closed || !room.participants.includes(sessionId)) {
    sendToSession(sessionId, 'chat:system_warning', {
      message: 'Aktif bir sohbet odasında değilsiniz.',
    });
    return;
  }

  // Rate limiting: stricter for users with prior report strikes or warnings
  const now = Date.now();
  const isStrict = session.reportStrikes > 0 || session.safetyWarnings > 1;
  const windowMs = isStrict ? 6000 : 5000;
  const maxCount = isStrict ? 3 : 6;
  session.messageTimestamps = session.messageTimestamps.filter(
    (ts) => now - ts < windowMs,
  );
  if (session.messageTimestamps.length >= maxCount) {
    sendToSession(sessionId, 'chat:system_warning', {
      message: isStrict
        ? 'Güvenlik denetimi nedeniyle mesaj gönderme hızınız sınırlandırılmıştır. Lütfen biraz bekleyin.'
        : 'Çok hızlı mesaj gönderiyorsunuz. Lütfen birkaç saniye bekleyin.',
    });
    return;
  }
  session.messageTimestamps.push(now);
  session.lastActiveAt = now;

  // Automatic safety filter
  const safety = evaluateMessageSafety(trimmed);

  if (safety.underageDetected) {
    session.status = 'underage_terminated';
    session.banReason = '18 yaş altı kullanım tespiti';
    store.bannedIpHashes.set(session.ipHash, {
      ipHash: session.ipHash,
      reason: '18 yaş altı kullanım nedeniyle kalıcı kapatma',
      permanent: true,
      expiresAt: now + 365 * 24 * 3600_000,
    });

    closeRoom(room.roomId, sessionId, 'banned');

    sendToSession(sessionId, 'session:terminated', {
      reason: safety.blockReason,
      underage: true,
    });

    broadcastToAdmins('admin:urgent_alert', {
      type: 'underage_auto_terminated',
      alias: room.participantAliases[sessionId] || session.displayName,
      createdAt: now,
      message: 'Otomatik güvenlik filtresi 18 yaş altı kullanım tespit edip oturumu kapattı.',
    });
    return;
  }

  if (!safety.allowed) {
    session.safetyWarnings += 1;
    sendToSession(sessionId, 'chat:system_warning', {
      message:
        safety.blockReason ||
        'Mesajınız topluluk kurallarına aykırı içerik nedeniyle engellendi.',
    });

    if (session.safetyWarnings >= 4) {
      session.status = 'temp_banned';
      session.banUntil = now + config.tempBanMinutes * 60_000;
      session.banReason = 'Tekrarlayan otomatik güvenlik ihlali';
      closeRoom(room.roomId, sessionId, 'banned');
      sendToSession(sessionId, 'session:terminated', {
        reason: `Tekrarlayan kural ihlalleri nedeniyle ${config.tempBanMinutes} dakika geçici kısıtlama uygulandı.`,
      });
    }
    return;
  }

  const msg: ChatMessageRecord = {
    id: store.generateId('msg'),
    roomId: room.roomId,
    senderSessionId: sessionId,
    senderAlias: room.participantAliases[sessionId] || session.displayName,
    text: safety.sanitizedText,
    createdAt: now,
    readByPartner: false,
    maskedFlags: safety.maskedFlags,
  };

  room.messages.push(msg);

  const partnerId = room.participants.find((id) => id !== sessionId);

  sendToSession(sessionId, 'chat:message', {
    id: msg.id,
    roomId: room.roomId,
    sender: 'self',
    senderAlias: msg.senderAlias,
    text: msg.text,
    createdAt: msg.createdAt,
    readByPartner: false,
    maskedFlags: msg.maskedFlags,
  });

  if (partnerId) {
    sendToSession(partnerId, 'chat:message', {
      id: msg.id,
      roomId: room.roomId,
      sender: 'partner',
      senderAlias: msg.senderAlias,
      text: msg.text,
      createdAt: msg.createdAt,
      readByPartner: false,
      maskedFlags: msg.maskedFlags,
    });
  }

  if (safety.maskedFlags.length > 0) {
    sendToSession(sessionId, 'chat:system_warning', {
      message:
        'Güvenliğiniz için mesajınızdaki kişisel bilgi veya uygunsuz ifadeler otomatik olarak gizlendi.',
    });
  }
}

export function handleTyping(
  sessionId: string,
  roomId: string,
  isTyping: boolean,
): void {
  const room = store.rooms.get(roomId);
  if (!room || room.closed || !room.participants.includes(sessionId)) return;
  const partnerId = room.participants.find((id) => id !== sessionId);
  if (!partnerId) return;
  sendToSession(partnerId, 'chat:typing', { roomId, isTyping: Boolean(isTyping) });
}

export function handleReadReceipt(
  sessionId: string,
  roomId: string,
  messageIds: string[],
): void {
  const room = store.rooms.get(roomId);
  if (!room || room.closed || !room.participants.includes(sessionId)) return;
  const updatedIds: string[] = [];
  for (const msg of room.messages) {
    if (
      msg.senderSessionId !== sessionId &&
      !msg.readByPartner &&
      messageIds.includes(msg.id)
    ) {
      msg.readByPartner = true;
      updatedIds.push(msg.id);
    }
  }
  if (updatedIds.length > 0) {
    const partnerId = room.participants.find((id) => id !== sessionId);
    if (partnerId) {
      sendToSession(partnerId, 'chat:read_ack', {
        roomId,
        messageIds: updatedIds,
      });
    }
  }
}

export function blockCurrentPartner(
  sessionId: string,
  roomId?: string,
): { ok: boolean } {
  const session = store.sessions.get(sessionId);
  if (!session) return { ok: false };

  const room =
    (roomId ? store.rooms.get(roomId) : undefined) ||
    findActiveRoomForSession(sessionId);

  if (room && room.participants.includes(sessionId)) {
    const partnerId = room.participants.find((id) => id !== sessionId);
    if (partnerId) {
      session.blockedSessionIds.add(partnerId);
    }
    closeRoom(room.roomId, sessionId, 'blocked');
  }
  return { ok: true };
}
