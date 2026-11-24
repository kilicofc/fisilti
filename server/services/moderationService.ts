import crypto from 'node:crypto';
import { config } from '../config.ts';
import type { ModerationSanction, ReportStatus } from '../types.ts';
import { closeRoom, findActiveRoomForSession } from './matchingService.ts';
import { broadcastActiveCount, broadcastToAdmins, sendToSession } from './realtimeBus.ts';
import { REPORT_REASON_LABELS } from './reportService.ts';
import { store } from './store.ts';

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getAdminAuthStatus(): {
  needsSetup: boolean;
  hasEnvCredentials: boolean;
} {
  const hasEnv =
    config.adminUsername.length > 0 && config.adminPassword.length > 0;
  return {
    needsSetup: !hasEnv && store.adminCredentials === null,
    hasEnvCredentials: hasEnv,
  };
}

function logAdminAudit(
  adminLabel: string,
  action: string,
  targetId: string,
  details: string,
): void {
  store.adminAuditLogs.push({
    id: store.generateId('aud'),
    adminLabel,
    action,
    targetId,
    details,
    createdAt: Date.now(),
  });
}

function issueAdminSession(username: string): {
  bearerToken: string;
  adminLabel: string;
  expiresAt: number;
} {
  const now = Date.now();
  const bearerToken = `adm_${crypto.randomBytes(24).toString('hex')}`;
  const bearerHash = store.hashToken(bearerToken);
  const expiresAt = now + config.adminSessionTtlHours * 3600_000;

  store.adminSessions.set(bearerHash, {
    tokenHash: bearerHash,
    label: username,
    createdAt: now,
    expiresAt,
  });

  return { bearerToken, adminLabel: username, expiresAt };
}

export function claimFirstRunCredentials(
  username: string,
  password: string,
): {
  ok: boolean;
  error?: string;
  bearerToken?: string;
  adminLabel?: string;
  expiresAt?: number;
} {
  if (config.adminUsername.length > 0 && config.adminPassword.length > 0) {
    return {
      ok: false,
      error:
        'Ortam değişkenlerinde yönetici bilgileri tanımlı olduğu için ilk kurulum kapalıdır.',
    };
  }

  if (store.adminCredentials !== null) {
    return {
      ok: false,
      error: 'Yönetici hesabı zaten oluşturulmuş. Kullanıcı adı ve şifrenizle giriş yapın.',
    };
  }

  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();
  if (cleanUser.length < 3) {
    return { ok: false, error: 'Kullanıcı adı en az 3 karakter olmalıdır.' };
  }
  if (cleanPass.length < 6) {
    return { ok: false, error: 'Şifre en az 6 karakter olmalıdır.' };
  }

  store.adminCredentials = {
    username: cleanUser,
    passwordHash: hashPasswordScrypt(cleanPass),
  };

  logAdminAudit(
    cleanUser,
    'admin_setup_claimed',
    'system',
    'Yönetici kullanıcı adı ve şifresi tanımlandı ve kilitlendi.',
  );

  const session = issueAdminSession(cleanUser);
  return { ok: true, ...session };
}

export function loginWithCredentials(
  username: string,
  password: string,
): {
  ok: boolean;
  error?: string;
  bearerToken?: string;
  adminLabel?: string;
  expiresAt?: number;
} {
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();
  if (!cleanUser || !cleanPass) {
    return { ok: false, error: 'Kullanıcı adı ve şifre giriniz.' };
  }

  let verified = false;
  if (config.adminUsername.length > 0 && config.adminPassword.length > 0) {
    const userMatch = timingSafeEqualStr(cleanUser, config.adminUsername);
    const passMatch = timingSafeEqualStr(cleanPass, config.adminPassword);
    verified = userMatch && passMatch;
  } else if (store.adminCredentials) {
    const userMatch = timingSafeEqualStr(cleanUser, store.adminCredentials.username);
    const passMatch = verifyPasswordScrypt(
      cleanPass,
      store.adminCredentials.passwordHash,
    );
    verified = userMatch && passMatch;
  } else {
    return {
      ok: false,
      error: 'Henüz yönetici hesabı oluşturulmamış. Önce kurulumu tamamlayın.',
    };
  }

  if (!verified) {
    logAdminAudit(
      cleanUser || 'Bilinmeyen',
      'admin_login_failed',
      'credentials',
      'Hatalı kullanıcı adı veya şifre denemesi.',
    );
    return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
  }

  const session = issueAdminSession(cleanUser);
  logAdminAudit(
    cleanUser,
    'admin_login_success',
    session.bearerToken.slice(0, 10),
    'Yönetici paneline giriş yapıldı.',
  );
  return { ok: true, ...session };
}

export function verifyAdminToken(bearerToken: string | undefined): {
  label: string;
  tokenHash: string;
} | null {
  if (!bearerToken) return null;
  const cleaned = bearerToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleaned) return null;
  const hash = store.hashToken(cleaned);
  const session = store.adminSessions.get(hash);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    store.adminSessions.delete(hash);
    return null;
  }
  return { label: session.label, tokenHash: hash };
}

export function logoutAdmin(bearerToken: string | undefined): void {
  const verified = verifyAdminToken(bearerToken);
  if (!verified) return;
  store.adminSessions.delete(verified.tokenHash);
  logAdminAudit(
    verified.label,
    'admin_logout',
    verified.tokenHash.slice(0, 12),
    'Yönetici oturumu sonlandırıldı.',
  );
}

export function getAdminOverview(adminLabel: string) {
  logAdminAudit(
    adminLabel,
    'admin_overview_viewed',
    'dashboard',
    'Yönetim paneli özet verileri görüntülendi.',
  );

  const activeRooms = Array.from(store.rooms.values())
    .filter((r) => !r.closed)
    .map((r) => ({
      roomId: r.roomId,
      aliases: r.participants.map((id) => r.participantAliases[id] || 'Anonim'),
      sharedInterests: r.sharedInterests,
      messageCount: r.messages.length,
      createdAt: r.createdAt,
    }));

  const reports = Array.from(store.reports.values())
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'urgent' ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    })
    .map((r) => {
      const targetSession = store.sessions.get(r.reportedSessionId);
      return {
        reportId: r.reportId,
        roomId: r.roomId,
        reportedAlias: r.reportedAlias,
        reportedStatus: targetSession?.status ?? 'active',
        reportedTotalStrikes: targetSession?.reportStrikes ?? r.reportedStrikeCountAtTime,
        reason: r.reason,
        reasonLabel: REPORT_REASON_LABELS[r.reason],
        description: r.description,
        priority: r.priority,
        status: r.status,
        transcript: r.transcript,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        actionTaken: r.actionTaken,
        expiresAt: r.expiresAt,
      };
    });

  const bannedUsers = Array.from(store.sessions.values())
    .filter((s) => s.status !== 'active')
    .map((s) => ({
      sessionId: s.sessionId,
      alias: s.displayName,
      status: s.status,
      reportStrikes: s.reportStrikes,
      safetyWarnings: s.safetyWarnings,
      banReason: s.banReason,
      banUntil: s.banUntil,
    }));

  const consents = [...store.consents]
    .reverse()
    .slice(0, 100)
    .map((c) => ({
      sessionId: `${c.sessionId.slice(0, 8)}…`,
      ageConfirmed: c.ageConfirmed,
      termsAccepted: c.termsAccepted,
      privacyAccepted: c.privacyAccepted,
      cookieAccepted: c.cookieAccepted,
      acceptedAt: c.acceptedAt,
      userAgentSummary: c.userAgentSummary,
    }));

  const auditLogs = [...store.adminAuditLogs].reverse().slice(0, 120);

  return {
    metrics: {
      activeUsers: Array.from(store.wsClients.values()).filter((set) =>
        Array.from(set).some((ws) => ws.readyState === ws.OPEN),
      ).length,
      activeRoomsCount: activeRooms.length,
      queueSize: store.waitingQueue.length,
      pendingReportsCount: reports.filter((r) => r.status === 'beklemede').length,
      urgentPendingCount: reports.filter(
        (r) => r.status === 'beklemede' && r.priority === 'urgent',
      ).length,
      bannedCount: bannedUsers.length,
      consentCount: store.consents.length,
    },
    activeRooms,
    reports,
    bannedUsers,
    consents,
    auditLogs,
  };
}

export function handleReportAction(
  adminLabel: string,
  reportId: string,
  newStatus: ReportStatus,
  sanction?: ModerationSanction,
): { ok: boolean; error?: string } {
  const report = store.reports.get(reportId);
  if (!report) {
    return { ok: false, error: 'Şikayet kaydı bulunamadı veya saklama süresi doldu.' };
  }

  const now = Date.now();
  report.status = newStatus;
  report.reviewedAt = now;

  const target = store.sessions.get(report.reportedSessionId);
  let actionLabel = 'İncelendi';

  if (sanction === 'temp_ban' && target) {
    target.status = 'temp_banned';
    target.banUntil = now + config.tempBanMinutes * 60_000;
    target.banReason = `Moderatör kararı (${REPORT_REASON_LABELS[report.reason]})`;
    actionLabel = `${config.tempBanMinutes} dakika geçici yasaklama uygulandı`;
    const activeRoom = findActiveRoomForSession(target.sessionId);
    if (activeRoom) closeRoom(activeRoom.roomId, target.sessionId, 'banned');
    sendToSession(target.sessionId, 'session:terminated', {
      reason: `Topluluk kuralları ihlali nedeniyle ${config.tempBanMinutes} dakika geçici kısıtlama uygulandı.`,
    });
  } else if (sanction === 'permanent_ban' && target) {
    target.status = 'permanently_banned';
    target.banReason = `Moderatör kararı (${REPORT_REASON_LABELS[report.reason]})`;
    store.bannedIpHashes.set(target.ipHash, {
      ipHash: target.ipHash,
      reason: target.banReason,
      permanent: true,
      expiresAt: now + 365 * 24 * 3600_000,
    });
    actionLabel = 'Kalıcı olarak yasaklandı';
    const activeRoom = findActiveRoomForSession(target.sessionId);
    if (activeRoom) closeRoom(activeRoom.roomId, target.sessionId, 'banned');
    sendToSession(target.sessionId, 'session:terminated', {
      reason: 'Topluluk kuralları ihlali nedeniyle hesabınız kalıcı olarak kapatıldı.',
    });
  } else if (sanction === 'underage_ban' && target) {
    target.status = 'underage_terminated';
    target.banReason = '18 yaş altı kullanıcı tespiti (Moderatör)';
    store.bannedIpHashes.set(target.ipHash, {
      ipHash: target.ipHash,
      reason: target.banReason,
      permanent: true,
      expiresAt: now + 365 * 24 * 3600_000,
    });
    actionLabel = '18 yaş altı tespiti — hesap derhal kapatıldı';
    const activeRoom = findActiveRoomForSession(target.sessionId);
    if (activeRoom) closeRoom(activeRoom.roomId, target.sessionId, 'banned');
    sendToSession(target.sessionId, 'session:terminated', {
      reason: '18 yaş sınırı nedeniyle erişiminiz kalıcı olarak kapatılmıştır.',
      underage: true,
    });
  } else if (sanction === 'dismiss') {
    actionLabel = 'İhlal tespit edilmedi, kapatıldı';
  }

  report.actionTaken = actionLabel;

  logAdminAudit(
    adminLabel,
    `report_${sanction || newStatus}`,
    reportId,
    `${report.reportedAlias} hakkında ${actionLabel}`,
  );

  if (newStatus === 'islem_yapildi' || newStatus === 'incelendi') {
    const noticeText =
      newStatus === 'islem_yapildi'
        ? 'İnceleme tamamlandı, gerekli işlem yapıldı.'
        : 'Şikayetin moderasyon ekibimiz tarafından incelendi.';
    const reporter = store.sessions.get(report.reporterSessionId);
    const notif = {
      id: store.generateId('ntf'),
      text: noticeText,
      createdAt: now,
    };
    if (reporter) {
      reporter.pendingNotifications.push(notif);
    }
    sendToSession(report.reporterSessionId, 'report:resolved', notif);
  }

  broadcastActiveCount();
  broadcastToAdmins('admin:report_updated', { reportId, status: newStatus });
  return { ok: true };
}
