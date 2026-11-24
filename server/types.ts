export type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'underage'
  | 'scam'
  | 'hate_speech'
  | 'spam'
  | 'other';

export type ReportStatus = 'beklemede' | 'incelendi' | 'islem_yapildi';

export type ReportPriority = 'normal' | 'urgent';

export type SessionStatus =
  | 'active'
  | 'temp_banned'
  | 'permanently_banned'
  | 'underage_terminated';

export type ModerationSanction =
  | 'mark_reviewed'
  | 'dismiss'
  | 'temp_ban'
  | 'permanent_ban'
  | 'underage_ban';

export interface ConsentRecord {
  sessionId: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cookieAccepted: boolean;
  acceptedAt: string;
  userAgentSummary: string;
}

export interface ChatMessageRecord {
  id: string;
  roomId: string;
  senderSessionId: string;
  senderAlias: string;
  text: string;
  createdAt: number;
  readByPartner: boolean;
  maskedFlags: string[];
}

export interface SessionState {
  sessionId: string;
  displayName: string;
  customNickname: string | null;
  avatarSeed: string;
  interests: string[];
  consent: ConsentRecord | null;
  ipHash: string;
  lastPartnerId: string | null;
  blockedSessionIds: Set<string>;
  dailyMatchCount: number;
  dailyMatchResetAt: number;
  reportStrikes: number;
  safetyWarnings: number;
  messageTimestamps: number[];
  status: SessionStatus;
  banUntil: number | null;
  banReason: string | null;
  pendingNotifications: Array<{ id: string; text: string; createdAt: number }>;
  createdAt: number;
  lastActiveAt: number;
}

export interface ChatRoom {
  roomId: string;
  participants: [string, string];
  participantAliases: Record<string, string>;
  participantAvatars: Record<string, string>;
  sharedInterests: string[];
  createdAt: number;
  messages: ChatMessageRecord[];
  reported: boolean;
  closed: boolean;
}

export interface TranscriptLine {
  senderRole: 'reporter' | 'reported';
  senderAlias: string;
  text: string;
  createdAt: number;
  maskedFlags: string[];
}

export interface ReportRecord {
  reportId: string;
  roomId: string;
  reporterSessionId: string;
  reportedSessionId: string;
  reportedAlias: string;
  reporterAlias: string;
  reason: ReportReason;
  description: string;
  priority: ReportPriority;
  status: ReportStatus;
  transcript: TranscriptLine[];
  reportedStrikeCountAtTime: number;
  createdAt: number;
  reviewedAt: number | null;
  actionTaken: string | null;
  expiresAt: number;
}

export interface AdminAuditEntry {
  id: string;
  adminLabel: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: number;
}

export interface OneTimeTokenEntry {
  tokenHash: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
}

export interface AdminSession {
  tokenHash: string;
  label: string;
  createdAt: number;
  expiresAt: number;
}

export interface BannedIpRecord {
  ipHash: string;
  reason: string;
  permanent: boolean;
  expiresAt: number;
}
