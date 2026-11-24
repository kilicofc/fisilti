export type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'underage'
  | 'scam'
  | 'hate_speech'
  | 'spam'
  | 'other';

export type ReportStatus = 'beklemede' | 'incelendi' | 'islem_yapildi';

export type AppPhase = 'lobby' | 'matching' | 'chatting';

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: 'self' | 'partner' | 'system';
  senderAlias?: string;
  text: string;
  createdAt: number;
  readByPartner?: boolean;
  maskedFlags?: string[];
}

export interface MatchInfo {
  roomId: string;
  selfAlias: string;
  selfAvatarSeed: string;
  partnerAlias: string;
  partnerAvatarSeed: string;
  sharedInterests: string[];
  dailyRemaining: number;
}

export interface AdminOverviewData {
  metrics: {
    activeUsers: number;
    activeRoomsCount: number;
    queueSize: number;
    pendingReportsCount: number;
    urgentPendingCount: number;
    bannedCount: number;
    consentCount: number;
  };
  activeRooms: Array<{
    roomId: string;
    aliases: string[];
    sharedInterests: string[];
    messageCount: number;
    createdAt: number;
  }>;
  reports: Array<{
    reportId: string;
    roomId: string;
    reportedAlias: string;
    reportedStatus: string;
    reportedTotalStrikes: number;
    reason: ReportReason;
    reasonLabel: string;
    description: string;
    priority: 'normal' | 'urgent';
    status: ReportStatus;
    transcript: Array<{
      senderRole: 'reporter' | 'reported';
      senderAlias: string;
      text: string;
      createdAt: number;
      maskedFlags: string[];
    }>;
    createdAt: number;
    reviewedAt: number | null;
    actionTaken: string | null;
    expiresAt: number;
  }>;
  bannedUsers: Array<{
    sessionId: string;
    alias: string;
    status: string;
    reportStrikes: number;
    safetyWarnings: number;
    banReason: string | null;
    banUntil: number | null;
  }>;
  consents: Array<{
    sessionId: string;
    ageConfirmed: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    cookieAccepted: boolean;
    acceptedAt: string;
    userAgentSummary: string;
  }>;
  auditLogs: Array<{
    id: string;
    adminLabel: string;
    action: string;
    targetId: string;
    details: string;
    createdAt: number;
  }>;
}
