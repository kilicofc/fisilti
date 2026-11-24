import { config } from '../config.ts';
import type {
  ReportPriority,
  ReportReason,
  ReportRecord,
  TranscriptLine,
} from '../types.ts';
import { closeRoom } from './matchingService.ts';
import { broadcastToAdmins, sendToSession } from './realtimeBus.ts';
import { isUrgentReportContent } from './safetyFilter.ts';
import { store } from './store.ts';

const VALID_REASONS = new Set<ReportReason>([
  'harassment',
  'sexual',
  'underage',
  'scam',
  'hate_speech',
  'spam',
  'other',
]);

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Taciz, tehdit veya hakaret',
  sexual: 'Cinsel içerik veya cinsel istek',
  underage: 'Reşit olmadığını düşündürecek davranış',
  scam: 'Dolandırıcılık veya kişisel bilgi isteme',
  hate_speech: 'Nefret söylemi',
  spam: 'Spam veya reklam',
  other: 'Diğer',
};

export interface CreateReportInput {
  roomId: string;
  reporterSessionId: string;
  reason: ReportReason;
  description?: string;
}

export function createReport(input: CreateReportInput): {
  ok: boolean;
  error?: string;
  reportId?: string;
  confirmationMessage?: string;
} {
  if (!VALID_REASONS.has(input.reason)) {
    return { ok: false, error: 'Geçersiz şikayet nedeni seçildi.' };
  }

  const description = (input.description || '').trim().slice(0, 500);
  if (input.reason === 'other' && description.length < 5) {
    return {
      ok: false,
      error: 'Diğer seçeneği için en az 5 karakterlik kısa bir açıklama yazınız.',
    };
  }

  const room = store.rooms.get(input.roomId);
  if (!room || !room.participants.includes(input.reporterSessionId)) {
    return {
      ok: false,
      error: 'Şikayet edilecek aktif veya yakın tarihli sohbet odası bulunamadı.',
    };
  }

  // Prevent duplicate reports for the same room by the same reporter
  for (const existing of store.reports.values()) {
    if (
      existing.roomId === input.roomId &&
      existing.reporterSessionId === input.reporterSessionId
    ) {
      return {
        ok: true,
        reportId: existing.reportId,
        confirmationMessage: 'Şikayetin alındı, incelenecek.',
      };
    }
  }

  const reportedSessionId =
    room.participants.find((id) => id !== input.reporterSessionId) || '';
  const reportedSession = store.sessions.get(reportedSessionId);
  const reporterSession = store.sessions.get(input.reporterSessionId);

  if (reporterSession && reportedSessionId) {
    reporterSession.blockedSessionIds.add(reportedSessionId);
  }

  // Freeze transcript for moderation review only when reported
  room.reported = true;
  const transcript: TranscriptLine[] = room.messages.map((m) => ({
    senderRole: m.senderSessionId === input.reporterSessionId ? 'reporter' : 'reported',
    senderAlias: m.senderAlias,
    text: m.text,
    createdAt: m.createdAt,
    maskedFlags: m.maskedFlags,
  }));

  const urgent =
    input.reason === 'underage' ||
    isUrgentReportContent(
      input.reason,
      description,
      transcript.map((t) => t.text),
    );
  const priority: ReportPriority = urgent ? 'urgent' : 'normal';

  const now = Date.now();
  const reportId = store.generateId('rep');
  const reportedAlias =
    room.participantAliases[reportedSessionId] ||
    reportedSession?.displayName ||
    'Anonim';
  const reporterAlias =
    room.participantAliases[input.reporterSessionId] ||
    reporterSession?.displayName ||
    'Anonim';

  if (reportedSession) {
    reportedSession.reportStrikes += 1;
  }

  const report: ReportRecord = {
    reportId,
    roomId: room.roomId,
    reporterSessionId: input.reporterSessionId,
    reportedSessionId,
    reportedAlias,
    reporterAlias,
    reason: input.reason,
    description,
    priority,
    status: 'beklemede',
    transcript,
    reportedStrikeCountAtTime: reportedSession?.reportStrikes ?? 1,
    createdAt: now,
    reviewedAt: null,
    actionTaken: null,
    expiresAt: now + config.reportRetentionHours * 3600_000,
  };

  store.reports.set(reportId, report);

  // Automatic enforcement when multiple reports accumulate
  if (reportedSession) {
    if (reportedSession.reportStrikes >= config.autoBanReportThreshold + 2) {
      reportedSession.status = 'permanently_banned';
      reportedSession.banReason =
        'Birden fazla kullanıcı şikayeti sonrası otomatik kalıcı yasaklama';
      store.bannedIpHashes.set(reportedSession.ipHash, {
        ipHash: reportedSession.ipHash,
        reason: reportedSession.banReason,
        permanent: true,
        expiresAt: now + 365 * 24 * 3600_000,
      });
      closeRoom(room.roomId, reportedSessionId, 'banned');
      sendToSession(reportedSessionId, 'session:terminated', {
        reason:
          'Topluluk kuralları ihlali nedeniyle erişiminiz kalıcı olarak kapatılmıştır.',
      });
    } else if (reportedSession.reportStrikes >= config.autoBanReportThreshold) {
      reportedSession.status = 'temp_banned';
      reportedSession.banUntil = now + config.tempBanMinutes * 60_000;
      reportedSession.banReason =
        'Çoklu şikayet nedeniyle otomatik geçici yasaklama';
      closeRoom(room.roomId, reportedSessionId, 'banned');
      sendToSession(reportedSessionId, 'session:terminated', {
        reason: `Hakkınızdaki şikayetler nedeniyle ${config.tempBanMinutes} dakika geçici erişim kısıtlaması uygulanmıştır.`,
      });
    }
  }

  // Close room silently for the reporter so they exit cleanly without exposing report to reported user
  if (!room.closed) {
    closeRoom(room.roomId, input.reporterSessionId, 'blocked');
  }

  // Broadcast to moderation panel; instant urgent alert for threats / minors / abuse
  if (priority === 'urgent') {
    broadcastToAdmins('admin:urgent_alert', {
      type: 'urgent_report',
      reportId,
      reason: REPORT_REASON_LABELS[input.reason],
      reportedAlias,
      createdAt: now,
      message: `ACİL ŞİKAYET: ${REPORT_REASON_LABELS[input.reason]} (${reportedAlias})`,
    });
  } else {
    broadcastToAdmins('admin:report_created', { reportId, priority });
  }

  return {
    ok: true,
    reportId,
    confirmationMessage: 'Şikayetin alındı, incelenecek.',
  };
}
