import 'dotenv/config';
import crypto from 'node:crypto';

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: readInt('PORT', 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  adminUsername: (process.env.ADMIN_USERNAME || '').trim(),
  adminPassword: (process.env.ADMIN_PASSWORD || '').trim(),
  sessionSigningSecret:
    (process.env.SESSION_SIGNING_SECRET || '').trim() ||
    crypto.randomBytes(32).toString('hex'),
  ipHashSalt:
    (process.env.IP_HASH_SALT || '').trim() ||
    crypto.randomBytes(16).toString('hex'),
  dailyMatchLimit: readInt('DAILY_MATCH_LIMIT', 50),
  reportRetentionHours: readInt('REPORT_RETENTION_HOURS', 72),
  securityLogTtlHours: readInt('SECURITY_LOG_TTL_HOURS', 24),
  autoBanReportThreshold: readInt('AUTO_BAN_REPORT_THRESHOLD', 3),
  tempBanMinutes: readInt('TEMP_BAN_MINUTES', 60),
  adminSessionTtlHours: 8,
} as const;
