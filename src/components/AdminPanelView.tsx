import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { tr } from '../i18n';
import type { AdminOverviewData, ReportStatus } from '../types/chat';
import { playUrgentAdminSound } from '../utils/sound';

type AdminTab = 'reports' | 'rooms' | 'bans' | 'consents' | 'audit';

export function AdminPanelView() {
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [adminLabel, setAdminLabel] = useState<string>('');
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [loadingAuthStatus, setLoadingAuthStatus] = useState<boolean>(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [urgentAlerts, setUrgentAlerts] = useState<
    Array<{ id: string; message: string; createdAt: number }>
  >([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadAuthStatus = useCallback(async () => {
    setLoadingAuthStatus(true);
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = await res.json();
      if (data.ok) {
        setNeedsSetup(Boolean(data.needsSetup));
      }
    } catch {
      setAuthError('Sunucu durumu alınamadı.');
    } finally {
      setLoadingAuthStatus(false);
    }
  }, []);

  const fetchOverview = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setBearerToken(null);
        setOverview(null);
        setAuthError('Oturum süresi doldu, lütfen tekrar giriş yapın.');
        return;
      }
      const json = await res.json();
      if (json.ok && json.data) {
        setOverview(json.data);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    if (!bearerToken) return;
    fetchOverview(bearerToken);

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${proto}//${window.location.host}/ws/admin?token=${encodeURIComponent(
        `Bearer ${bearerToken}`,
      )}`,
    );

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'admin:urgent_alert') {
          playUrgentAdminSound();
          setUrgentAlerts((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              message: msg.payload?.message || 'Acil moderasyon bildirimi',
              createdAt: msg.payload?.createdAt || Date.now(),
            },
            ...prev.slice(0, 4),
          ]);
          fetchOverview(bearerToken);
        } else if (
          msg.event === 'admin:report_created' ||
          msg.event === 'admin:report_updated'
        ) {
          fetchOverview(bearerToken);
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(() => {
      fetchOverview(bearerToken);
    }, 15000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [bearerToken, fetchOverview]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Kurulum tamamlanamadı.');
        return;
      }
      setBearerToken(data.bearerToken);
      setAdminLabel(data.adminLabel || username);
      setNeedsSetup(false);
      setPassword('');
    } catch {
      setAuthError('Sunucuya bağlanılamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Giriş başarısız.');
        return;
      }
      setBearerToken(data.bearerToken);
      setAdminLabel(data.adminLabel || username);
      setPassword('');
    } catch {
      setAuthError('Sunucuya bağlanılamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    if (bearerToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearerToken}` },
      }).catch(() => {});
    }
    setBearerToken(null);
    setOverview(null);
    loadAuthStatus();
  }

  async function handleReportAction(
    reportId: string,
    status: ReportStatus,
    sanction?: string,
  ) {
    if (!bearerToken) return;
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ status, sanction }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionFeedback(
          'İşlem uygulandı ve şikayet eden kullanıcıya genel bildirim iletildi.',
        );
        fetchOverview(bearerToken);
      }
    } catch {
      // ignore
    }
  }

  async function handleUnban(sessionId: string) {
    if (!bearerToken) return;
    try {
      const res = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionFeedback('Kullanıcı yasağı kaldırıldı.');
        fetchOverview(bearerToken);
      } else {
        setActionFeedback(data.error || 'İşlem başarısız.');
      }
    } catch {
      // ignore
    }
  }

  if (!bearerToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#00A884]/15 text-[#00A884] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#111B21] dark:text-[#E9EDEF]">
                {needsSetup ? tr.admin.setupTitle : tr.admin.loginTitle}
              </h1>
              <p className="text-xs text-[#54656F] dark:text-[#8696A0]">
                {tr.admin.title}
              </p>
            </div>
          </div>

          {loadingAuthStatus ? (
            <p className="text-sm text-[#54656F] dark:text-[#8696A0]">
              Durum kontrol ediliyor...
            </p>
          ) : (
            <form
              onSubmit={needsSetup ? handleSetup : handleLogin}
              className="space-y-4"
            >
              {needsSetup && (
                <p className="text-xs text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                  {tr.admin.setupDesc}
                </p>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-username"
                  className="block text-xs font-semibold text-[#111B21] dark:text-[#E9EDEF]"
                >
                  {tr.admin.usernameLabel}
                </label>
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={tr.admin.usernamePlaceholder}
                  required
                  className="w-full min-h-[44px] rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5] dark:bg-[#111B21] px-4 py-2 text-base sm:text-sm text-[#111B21] dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-[#111B21] dark:text-[#E9EDEF]"
                >
                  {tr.admin.passwordLabel}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr.admin.passwordPlaceholder}
                  required
                  className="w-full min-h-[44px] rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5] dark:bg-[#111B21] px-4 py-2 text-base sm:text-sm text-[#111B21] dark:text-[#E9EDEF] focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                />
              </div>

              {authError && (
                <p className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-full bg-[#00A884] hover:bg-[#008F6F] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {submitting
                  ? 'Doğrulanıyor...'
                  : needsSetup
                  ? tr.admin.setupSubmit
                  : tr.admin.loginButton}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const filteredReports =
    overview?.reports.filter((r) =>
      statusFilter === 'all' ? true : r.status === statusFilter,
    ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D1D7DB] dark:border-[#222E35] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111B21] dark:text-[#E9EDEF]">
            {tr.admin.title}
          </h1>
          <p className="text-xs text-[#54656F] dark:text-[#8696A0]">
            Oturum: <span className="font-semibold">{adminLabel}</span> · Tüm yönetici erişimleri kayıt altındadır
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOverview(bearerToken)}
            className="min-h-[40px] px-4 py-2 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[40px] px-4 py-2 rounded-full border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{tr.admin.logoutButton}</span>
          </button>
        </div>
      </div>

      {urgentAlerts.length > 0 && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Anlık Acil Güvenlik Bildirimleri</span>
            </div>
            <button
              type="button"
              onClick={() => setUrgentAlerts([])}
              className="text-xs text-rose-700 dark:text-rose-300 underline"
            >
              Temizle
            </button>
          </div>
          {urgentAlerts.map((a) => (
            <p
              key={a.id}
              className="text-xs text-rose-800 dark:text-rose-200 font-medium"
            >
              {new Date(a.createdAt).toLocaleTimeString('tr-TR')} — {a.message}
            </p>
          ))}
        </div>
      )}

      {actionFeedback && (
        <div className="rounded-xl border border-[#00A884]/40 bg-[#E7FCE3] dark:bg-[#005C4B]/40 px-4 py-3 flex items-center justify-between text-xs text-[#008069] dark:text-[#D9FDD3]">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {actionFeedback}
          </span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="underline"
          >
            Kapat
          </button>
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Aktif Kullanıcı', value: overview.metrics.activeUsers },
            { label: 'Aktif Eşleşme', value: overview.metrics.activeRoomsCount },
            { label: 'Bekleyen Kuyruk', value: overview.metrics.queueSize },
            { label: 'Bekleyen Şikayet', value: overview.metrics.pendingReportsCount },
            {
              label: 'Acil Öncelikli',
              value: overview.metrics.urgentPendingCount,
              alert: overview.metrics.urgentPendingCount > 0,
            },
            {
              label: 'Yasaklı / Onay',
              value: `${overview.metrics.bannedCount} / ${overview.metrics.consentCount}`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-4 bg-white dark:bg-[#202C33] ${
                item.alert
                  ? 'border-rose-300 dark:border-rose-800'
                  : 'border-[#D1D7DB] dark:border-[#2A3942]'
              }`}
            >
              <p className="text-xs text-[#54656F] dark:text-[#8696A0]">
                {item.label}
              </p>
              <p
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                  item.alert
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#111B21] dark:text-[#E9EDEF]'
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-[#D1D7DB] dark:border-[#222E35] pb-3">
        {(['reports', 'rooms', 'bans', 'consents', 'audit'] as AdminTab[]).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-[40px] px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'bg-[#00A884] text-white'
                  : 'bg-white dark:bg-[#202C33] text-[#54656F] dark:text-[#8696A0] hover:text-[#111B21] dark:hover:text-[#E9EDEF]'
              }`}
            >
              {tr.admin.tabs[tab]}
            </button>
          ),
        )}
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'all', label: 'Tümü' },
                { key: 'beklemede', label: tr.admin.statuses.beklemede },
                { key: 'incelendi', label: tr.admin.statuses.incelendi },
                { key: 'islem_yapildi', label: tr.admin.statuses.islem_yapildi },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f.key
                    ? 'border-[#00A884] bg-[#E7FCE3] dark:bg-[#005C4B]/40 text-[#008069] dark:text-[#D9FDD3]'
                    : 'border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] text-[#54656F] dark:text-[#8696A0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] p-8 text-center text-sm text-[#54656F] dark:text-[#8696A0]">
              Bu filtrede şikayet kaydı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const expanded = selectedReportId === rep.reportId;
                return (
                  <div
                    key={rep.reportId}
                    className={`rounded-2xl border bg-white dark:bg-[#202C33] p-4 sm:p-5 space-y-3 ${
                      rep.priority === 'urgent'
                        ? 'border-rose-300 dark:border-rose-800'
                        : 'border-[#D1D7DB] dark:border-[#2A3942]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              rep.priority === 'urgent'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[#54656F] dark:text-[#8696A0]'
                            }`}
                          >
                            {rep.priority === 'urgent' ? 'ACİL ÖNCELİKLİ' : 'Standart'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#54656F] dark:text-[#8696A0]">
                            {new Date(rep.createdAt).toLocaleString('tr-TR')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#111B21] dark:text-[#E9EDEF]">
                            Durum: {tr.admin.statuses[rep.status]}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#54656F] dark:text-[#8696A0]">
                            Toplam İhlal: {rep.reportedTotalStrikes}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                          {rep.reportedAlias} — {rep.reasonLabel}
                        </p>
                        {rep.description && (
                          <p className="text-xs sm:text-sm text-[#54656F] dark:text-[#D1D7DB]">
                            Açıklama: {rep.description}
                          </p>
                        )}
                        {rep.actionTaken && (
                          <p className="text-xs text-[#008069] dark:text-[#00A884] font-medium">
                            Uygulanan işlem: {rep.actionTaken}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReportId(expanded ? null : rep.reportId)
                        }
                        className="min-h-[38px] px-4 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] whitespace-nowrap"
                      >
                        {expanded
                          ? 'Sohbet Kaydını Gizle'
                          : `Sohbet Kaydı (${rep.transcript.length})`}
                      </button>
                    </div>

                    {expanded && (
                      <div className="rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5] dark:bg-[#111B21] p-4 space-y-3">
                        <div className="text-xs text-[#54656F] dark:text-[#8696A0] flex items-center justify-between">
                          <span>Dondurulmuş Sohbet Dökümü (Şikayet eden kimliği gizli)</span>
                          <span className="font-mono tabular-nums">
                            Otomatik silinme: {new Date(rep.expiresAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        {rep.transcript.length === 0 ? (
                          <p className="text-xs text-[#54656F]">
                            Bu sohbette mesaj kaydı yok.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                            {rep.transcript.map((line, idx) => (
                              <div
                                key={idx}
                                className="flex items-baseline gap-2 py-1 border-b border-[#D1D7DB]/60 dark:border-[#2A3942] last:border-0"
                              >
                                <span className="font-mono tabular-nums text-[#667781] shrink-0">
                                  {new Date(line.createdAt).toLocaleTimeString('tr-TR')}
                                </span>
                                <span
                                  className={`font-semibold shrink-0 ${
                                    line.senderRole === 'reported'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-[#008069] dark:text-[#00A884]'
                                  }`}
                                >
                                  {line.senderRole === 'reported'
                                    ? `${line.senderAlias} (Şikayet Edilen)`
                                    : 'Şikayet Eden'}
                                  :
                                </span>
                                <span className="text-[#111B21] dark:text-[#E9EDEF] break-words">
                                  {line.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.reportId, 'incelendi', 'mark_reviewed')
                        }
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium hover:bg-[#F0F2F5] dark:hover:bg-[#111B21]"
                      >
                        {tr.admin.sanctions.mark_reviewed}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.reportId, 'islem_yapildi', 'dismiss')
                        }
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium hover:bg-[#F0F2F5] dark:hover:bg-[#111B21]"
                      >
                        {tr.admin.sanctions.dismiss}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.reportId, 'islem_yapildi', 'temp_ban')
                        }
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                      >
                        {tr.admin.sanctions.temp_ban}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.reportId, 'islem_yapildi', 'permanent_ban')
                        }
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
                      >
                        {tr.admin.sanctions.permanent_ban}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.reportId, 'islem_yapildi', 'underage_ban')
                        }
                        className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-rose-800 hover:bg-rose-900 text-white text-xs font-medium inline-flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{tr.admin.sanctions.underage_ban}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rooms' && overview && (
        <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[#E9EDEF] dark:border-[#2A3942] text-[#54656F] dark:text-[#8696A0]">
              <tr>
                <th className="px-4 py-3 font-medium">Oda ID</th>
                <th className="px-4 py-3 font-medium">Geçici Takma Adlar</th>
                <th className="px-4 py-3 font-medium">Ortak İlgi</th>
                <th className="px-4 py-3 font-medium text-right">Mesaj</th>
                <th className="px-4 py-3 font-medium text-right">Başlangıç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF] dark:divide-[#2A3942]">
              {overview.activeRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#54656F]">
                    Şu anda aktif eşleşme bulunmuyor.
                  </td>
                </tr>
              ) : (
                overview.activeRooms.map((r) => (
                  <tr key={r.roomId}>
                    <td className="px-4 py-3 font-mono text-xs">{r.roomId}</td>
                    <td className="px-4 py-3">{r.aliases.join(' ↔ ')}</td>
                    <td className="px-4 py-3 text-[#54656F] dark:text-[#8696A0]">
                      {r.sharedInterests.length > 0
                        ? r.sharedInterests.join(', ')
                        : 'Rastgele'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.messageCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                      {new Date(r.createdAt).toLocaleTimeString('tr-TR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'bans' && overview && (
        <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[#E9EDEF] dark:border-[#2A3942] text-[#54656F] dark:text-[#8696A0]">
              <tr>
                <th className="px-4 py-3 font-medium">Takma Ad</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Neden</th>
                <th className="px-4 py-3 font-medium text-right">Şikayet</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF] dark:divide-[#2A3942]">
              {overview.bannedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#54656F]">
                    Yasaklı kullanıcı bulunmuyor.
                  </td>
                </tr>
              ) : (
                overview.bannedUsers.map((u) => (
                  <tr key={u.sessionId}>
                    <td className="px-4 py-3 font-medium">{u.alias}</td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">
                      {u.status}
                    </td>
                    <td className="px-4 py-3 text-[#54656F] dark:text-[#D1D7DB]">
                      {u.banReason || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {u.reportStrikes}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.status !== 'underage_terminated' && (
                        <button
                          type="button"
                          onClick={() => handleUnban(u.sessionId)}
                          className="px-3.5 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium hover:bg-[#F0F2F5] dark:hover:bg-[#111B21]"
                        >
                          Yasağı Kaldır
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'consents' && overview && (
        <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[#E9EDEF] dark:border-[#2A3942] text-[#54656F] dark:text-[#8696A0]">
              <tr>
                <th className="px-4 py-3 font-medium">Anonim Oturum</th>
                <th className="px-4 py-3 font-medium">18+ / Koşul / KVKK / Çerez</th>
                <th className="px-4 py-3 font-medium">Tarih ve Saat</th>
                <th className="px-4 py-3 font-medium">İstemci Özeti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF] dark:divide-[#2A3942]">
              {overview.consents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#54656F]">
                    Henüz onay kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                overview.consents.map((c, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-mono text-xs">{c.sessionId}</td>
                    <td className="px-4 py-3 text-[#008069] dark:text-[#00A884] font-medium">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        4/4 Onaylı
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs">
                      {new Date(c.acceptedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#54656F] truncate max-w-xs">
                      {c.userAgentSummary}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && overview && (
        <div className="rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[#E9EDEF] dark:border-[#2A3942] text-[#54656F] dark:text-[#8696A0]">
              <tr>
                <th className="px-4 py-3 font-medium">Zaman</th>
                <th className="px-4 py-3 font-medium">Yönetici</th>
                <th className="px-4 py-3 font-medium">Eylem</th>
                <th className="px-4 py-3 font-medium">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEF] dark:divide-[#2A3942]">
              {overview.auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-mono tabular-nums text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.adminLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#54656F] dark:text-[#8696A0]">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-[#111B21] dark:text-[#E9EDEF]">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
