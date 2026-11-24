import express from 'express';
import { config } from '../config.ts';
import {
  checkDailyMatchQuota,
  deleteSessionData,
  recordConsent,
  updatePreferences,
} from '../services/consentService.ts';
import { closeRoom, findActiveRoomForSession } from '../services/matchingService.ts';
import { blockCurrentPartner } from '../services/messagingService.ts';
import { broadcastActiveCount, getActiveUserCount } from '../services/realtimeBus.ts';
import { createReport } from '../services/reportService.ts';
import { store } from '../services/store.ts';
import type { ReportReason } from '../types.ts';

function extractClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'fisilti',
    activeUsers: getActiveUserCount(),
    uptimeSec: Math.floor(process.uptime()),
  });
});

apiRouter.get('/stats', (_req, res) => {
  res.json({
    activeUsers: getActiveUserCount(),
    dailyMatchLimit: config.dailyMatchLimit,
  });
});

apiRouter.post('/consent', (req, res) => {
  const body = req.body || {};
  const result = recordConsent({
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
    ageConfirmed: Boolean(body.ageConfirmed),
    termsAccepted: Boolean(body.termsAccepted),
    privacyAccepted: Boolean(body.privacyAccepted),
    cookieAccepted: Boolean(body.cookieAccepted),
    userAgent: req.headers['user-agent'],
    ip: extractClientIp(req),
  });

  if (!result.ok || !result.session || !result.consent) {
    res.status(400).json({ ok: false, error: result.error });
    return;
  }

  const quota = checkDailyMatchQuota(result.session);
  res.json({
    ok: true,
    sessionId: result.session.sessionId,
    acceptedAt: result.consent.acceptedAt,
    dailyRemaining: quota.remaining,
    dailyMatchLimit: config.dailyMatchLimit,
  });
});

apiRouter.post('/session/preferences', (req, res) => {
  const body = req.body || {};
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const nickname = typeof body.nickname === 'string' ? body.nickname : null;
  const interests = Array.isArray(body.interests) ? body.interests : [];

  const result = updatePreferences(sessionId, nickname, interests);
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.error });
    return;
  }
  res.json(result);
});

apiRouter.post('/session/delete', (req, res) => {
  const body = req.body || {};
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    res.status(400).json({ ok: false, error: 'Oturum kimliği eksik.' });
    return;
  }

  const activeRoom = findActiveRoomForSession(sessionId);
  if (activeRoom) {
    closeRoom(activeRoom.roomId, sessionId, 'ended');
  }

  deleteSessionData(sessionId);

  const sockets = store.wsClients.get(sessionId);
  if (sockets) {
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.close(1000, 'KVKK veri silme talebi');
      }
    }
    store.wsClients.delete(sessionId);
  }

  broadcastActiveCount();
  res.json({
    ok: true,
    message:
      'Oturumunuz, onay kayıtlarınız ve geçici verileriniz KVKK kapsamında sistemden kalıcı olarak silindi.',
  });
});

apiRouter.post('/block', (req, res) => {
  const body = req.body || {};
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const roomId = typeof body.roomId === 'string' ? body.roomId : undefined;
  const result = blockCurrentPartner(sessionId, roomId);
  res.json(result);
});

apiRouter.post('/reports', (req, res) => {
  const body = req.body || {};
  const roomId = typeof body.roomId === 'string' ? body.roomId : '';
  const reporterSessionId =
    typeof body.sessionId === 'string' ? body.sessionId : '';
  const reason = (typeof body.reason === 'string'
    ? body.reason
    : '') as ReportReason;
  const description =
    typeof body.description === 'string' ? body.description : '';

  const result = createReport({
    roomId,
    reporterSessionId,
    reason,
    description,
  });

  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.error });
    return;
  }

  res.json(result);
});
