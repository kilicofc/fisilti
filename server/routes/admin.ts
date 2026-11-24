import express from 'express';
import {
  claimFirstRunCredentials,
  getAdminAuthStatus,
  getAdminOverview,
  handleReportAction,
  loginWithCredentials,
  logoutAdmin,
  verifyAdminToken,
} from '../services/moderationService.ts';
import { store } from '../services/store.ts';
import type { ModerationSanction, ReportStatus } from '../types.ts';

export const adminRouter = express.Router();

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const auth = verifyAdminToken(req.headers.authorization);
  if (!auth) {
    res.status(401).json({ ok: false, error: 'Yönetici oturumu geçersiz veya süresi dolmuş.' });
    return;
  }
  res.locals.adminLabel = auth.label;
  next();
}

adminRouter.get('/auth-status', (_req, res) => {
  res.json({ ok: true, ...getAdminAuthStatus() });
});

adminRouter.post('/setup', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const result = claimFirstRunCredentials(username, password);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

adminRouter.post('/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const result = loginWithCredentials(username, password);
  if (!result.ok) {
    res.status(401).json(result);
    return;
  }
  res.json(result);
});

adminRouter.post('/logout', (req, res) => {
  logoutAdmin(req.headers.authorization);
  res.json({ ok: true });
});

adminRouter.get('/overview', requireAdmin, (_req, res) => {
  const adminLabel = String(res.locals.adminLabel || 'Moderatör');
  res.json({ ok: true, data: getAdminOverview(adminLabel) });
});

adminRouter.post('/reports/:reportId/action', requireAdmin, (req, res) => {
  const adminLabel = String(res.locals.adminLabel || 'Moderatör');
  const reportId = String(req.params.reportId || '');
  const status = req.body?.status as ReportStatus;
  const sanction = req.body?.sanction as ModerationSanction | undefined;

  if (!['beklemede', 'incelendi', 'islem_yapildi'].includes(status)) {
    res.status(400).json({ ok: false, error: 'Geçersiz şikayet durumu.' });
    return;
  }

  const result = handleReportAction(adminLabel, reportId, status, sanction);
  if (!result.ok) {
    res.status(404).json(result);
    return;
  }
  res.json({ ok: true });
});

adminRouter.post('/unban', requireAdmin, (req, res) => {
  const adminLabel = String(res.locals.adminLabel || 'Moderatör');
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  const target = store.sessions.get(sessionId);
  if (!target) {
    res.status(404).json({ ok: false, error: 'Oturum bulunamadı.' });
    return;
  }
  if (target.status === 'underage_terminated') {
    res.status(400).json({
      ok: false,
      error: '18 yaş altı tespiti nedeniyle kapatılan hesaplar yeniden açılamaz.',
    });
    return;
  }
  target.status = 'active';
  target.banUntil = null;
  target.banReason = null;
  store.bannedIpHashes.delete(target.ipHash);
  store.adminAuditLogs.push({
    id: store.generateId('aud'),
    adminLabel,
    action: 'unban_session',
    targetId: sessionId,
    details: `${target.displayName} yasağı kaldırıldı.`,
    createdAt: Date.now(),
  });
  res.json({ ok: true });
});
