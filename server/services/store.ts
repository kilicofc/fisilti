import crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import { config } from '../config.ts';
import type {
  AdminAuditEntry,
  AdminSession,
  BannedIpRecord,
  ChatRoom,
  ConsentRecord,
  ReportRecord,
  SessionState,
} from '../types.ts';

export interface QueueEntry {
  sessionId: string;
  joinedAt: number;
}

class InMemoryStore {
  sessions = new Map<string, SessionState>();
  rooms = new Map<string, ChatRoom>();
  waitingQueue: QueueEntry[] = [];
  reports = new Map<string, ReportRecord>();
  consents: ConsentRecord[] = [];
  bannedIpHashes = new Map<string, BannedIpRecord>();
  adminAuditLogs: AdminAuditEntry[] = [];
  adminCredentials: { username: string; passwordHash: string } | null = null;
  adminSessions = new Map<string, AdminSession>();
  wsClients = new Map<string, Set<WebSocket>>();
  adminWsClients = new Set<WebSocket>();
  private sweepInterval: ReturnType<typeof setInterval> | null = null;

  hashIp(rawIp: string): string {
    return crypto
      .createHmac('sha256', config.ipHashSalt)
      .update(rawIp || 'unknown')
      .digest('hex')
      .slice(0, 32);
  }

  hashToken(token: string): string {
    return crypto
      .createHmac('sha256', config.sessionSigningSecret)
      .update(token)
      .digest('hex');
  }

  generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  startSweeper(): void {
    if (this.sweepInterval) return;
    this.sweepInterval = setInterval(() => {
      this.sweepExpired();
    }, 60_000 * 5);
    this.sweepInterval.unref();
  }

  sweepExpired(): void {
    const now = Date.now();

    for (const [reportId, report] of this.reports.entries()) {
      if (now >= report.expiresAt) {
        this.reports.delete(reportId);
      }
    }

    for (const [ipHash, ban] of this.bannedIpHashes.entries()) {
      if (!ban.permanent && now >= ban.expiresAt) {
        this.bannedIpHashes.delete(ipHash);
      }
    }

    for (const [hash, session] of this.adminSessions.entries()) {
      if (now >= session.expiresAt) {
        this.adminSessions.delete(hash);
      }
    }

    const securityTtlMs = config.securityLogTtlHours * 3600_000;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        session.status === 'temp_banned' &&
        session.banUntil !== null &&
        now >= session.banUntil
      ) {
        session.status = 'active';
        session.banUntil = null;
        session.banReason = null;
      }

      const hasSocket = (this.wsClients.get(sessionId)?.size ?? 0) > 0;
      if (
        !hasSocket &&
        session.status === 'active' &&
        now - session.lastActiveAt > securityTtlMs
      ) {
        this.sessions.delete(sessionId);
      }
    }

    if (this.consents.length > 2000) {
      this.consents = this.consents.slice(-2000);
    }
    if (this.adminAuditLogs.length > 1000) {
      this.adminAuditLogs = this.adminAuditLogs.slice(-1000);
    }
  }
}

export const store = new InMemoryStore();
