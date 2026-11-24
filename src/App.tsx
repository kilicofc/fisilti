import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Moon, Sun, X } from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { FisiltiLogo } from './components/BrandMark';
import { ChatView } from './components/ChatView';
import {
  ConsentLobbyView,
  type ConsentFormState,
} from './components/ConsentLobbyView';
import { LegalModal, type LegalDocType } from './components/LegalModal';
import { MatchingView } from './components/MatchingView';
import { PromoVideoView } from './components/PromoVideoView';
import { ReportModal } from './components/ReportModal';
import { tr } from './i18n';
import type { AppPhase, ChatMessage, MatchInfo } from './types/chat';
import { playMatchSound, playMessageSound } from './utils/sound';

function resolveRouteFromPath(): 'home' | 'admin' | 'promo' {
  if (window.location.pathname === '/admingiris') return 'admin';
  if (window.location.pathname === '/tanitim') return 'promo';
  return 'home';
}

const CONSENT_STORAGE_KEY = 'fisilti_consent_v1';

interface SavedConsentMeta {
  accepted: boolean;
  sessionId?: string;
  acceptedAt?: string;
}

function readSavedConsent(): SavedConsentMeta | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedConsentMeta;
    if (parsed && parsed.accepted === true && typeof parsed.acceptedAt === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const initialConsent = readSavedConsent();
  const [route, setRoute] = useState<'home' | 'admin' | 'promo'>(
    resolveRouteFromPath,
  );
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);

  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    initialConsent?.sessionId || null,
  );
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(
    initialConsent?.acceptedAt || null,
  );
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);

  const [nickname, setNickname] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [consentState, setConsentState] = useState<ConsentFormState>({
    ageConfirmed: Boolean(initialConsent?.accepted),
    termsAccepted: Boolean(initialConsent?.accepted),
    privacyAccepted: Boolean(initialConsent?.accepted),
    cookieAccepted: Boolean(initialConsent?.accepted),
  });

  const [phase, setPhase] = useState<AppPhase>('lobby');
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [endedNotice, setEndedNotice] = useState<string | null>(null);

  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = match?.roomId ?? null;

  const pushToast = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  // Sync theme on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Hidden /admingiris and /tanitim SPA routes
  useEffect(() => {
    const onPop = () => {
      setRoute(resolveRouteFromPath());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigateHome() {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setRoute('home');
  }

  function navigatePromo() {
    if (window.location.pathname !== '/tanitim') {
      window.history.pushState({}, '', '/tanitim');
    }
    setRoute('promo');
  }

  // Initial active user stats before consent
  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (alive && typeof data.activeUsers === 'number') {
          setActiveUsers(data.activeUsers);
        }
      } catch {
        // ignore
      }
    };
    loadStats();
    const timer = setInterval(loadStats, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Manage WebSocket lifecycle once sessionId is granted
  const ensureWebSocket = useCallback(
    (sid: string): Promise<WebSocket> => {
      const existing = wsRef.current;
      if (existing && existing.readyState === WebSocket.OPEN) {
        return Promise.resolve(existing);
      }

      return new Promise((resolve, reject) => {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(
          `${proto}//${window.location.host}/ws?sessionId=${encodeURIComponent(sid)}`,
        );

        ws.onopen = () => {
          wsRef.current = ws;
          resolve(ws);
        };

        ws.onerror = () => {
          reject(new Error('WebSocket bağlantısı kurulamadı.'));
        };

        ws.onmessage = (evt) => {
          let parsed: { event?: string; payload?: Record<string, unknown> };
          try {
            parsed = JSON.parse(evt.data);
          } catch {
            return;
          }
          const { event, payload = {} } = parsed;

          switch (event) {
            case 'presence:count': {
              if (typeof payload.activeUsers === 'number') {
                setActiveUsers(payload.activeUsers);
              }
              break;
            }

            case 'match:waiting': {
              setPhase('matching');
              setMatch(null);
              setMessages([]);
              setEndedNotice(null);
              setPartnerTyping(false);
              if (typeof payload.dailyRemaining === 'number') {
                setDailyRemaining(payload.dailyRemaining);
              }
              break;
            }

            case 'match:cancelled': {
              setPhase('lobby');
              break;
            }

            case 'match:error': {
              setPhase('lobby');
              setLobbyError(
                typeof payload.message === 'string'
                  ? payload.message
                  : 'Eşleşme başlatılamadı.',
              );
              break;
            }

            case 'match:found': {
              const nextMatch: MatchInfo = {
                roomId: String(payload.roomId || ''),
                selfAlias: String(payload.selfAlias || 'Anonim'),
                selfAvatarSeed: String(payload.selfAvatarSeed || ''),
                partnerAlias: String(payload.partnerAlias || 'Anonim'),
                partnerAvatarSeed: String(payload.partnerAvatarSeed || ''),
                sharedInterests: Array.isArray(payload.sharedInterests)
                  ? (payload.sharedInterests as string[])
                  : [],
                dailyRemaining:
                  typeof payload.dailyRemaining === 'number'
                    ? payload.dailyRemaining
                    : 0,
              };
              setDailyRemaining(nextMatch.dailyRemaining);
              setMatch(nextMatch);
              setMessages([]);
              setEndedNotice(null);
              setPartnerTyping(false);
              setPhase('chatting');
              playMatchSound(mutedRef.current);
              break;
            }

            case 'chat:message': {
              const incoming: ChatMessage = {
                id: String(payload.id || ''),
                roomId: String(payload.roomId || ''),
                sender: payload.sender === 'self' ? 'self' : 'partner',
                senderAlias:
                  typeof payload.senderAlias === 'string'
                    ? payload.senderAlias
                    : undefined,
                text: String(payload.text || ''),
                createdAt:
                  typeof payload.createdAt === 'number'
                    ? payload.createdAt
                    : Date.now(),
                readByPartner: Boolean(payload.readByPartner),
                maskedFlags: Array.isArray(payload.maskedFlags)
                  ? (payload.maskedFlags as string[])
                  : [],
              };

              if (incoming.roomId !== activeRoomIdRef.current) break;

              setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
              });

              if (incoming.sender === 'partner') {
                setPartnerTyping(false);
                playMessageSound(mutedRef.current);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      event: 'chat:read',
                      payload: {
                        roomId: incoming.roomId,
                        messageIds: [incoming.id],
                      },
                    }),
                  );
                }
              }
              break;
            }

            case 'chat:typing': {
              if (payload.roomId === activeRoomIdRef.current) {
                setPartnerTyping(Boolean(payload.isTyping));
              }
              break;
            }

            case 'chat:read_ack': {
              if (
                payload.roomId === activeRoomIdRef.current &&
                Array.isArray(payload.messageIds)
              ) {
                const ackIds = new Set(payload.messageIds as string[]);
                setMessages((prev) =>
                  prev.map((m) =>
                    ackIds.has(m.id) ? { ...m, readByPartner: true } : m,
                  ),
                );
              }
              break;
            }

            case 'chat:system_warning': {
              const warnText =
                typeof payload.message === 'string' ? payload.message : '';
              if (!warnText) break;
              setMessages((prev) => [
                ...prev,
                {
                  id: `sys-${Date.now()}-${Math.random()}`,
                  roomId: activeRoomIdRef.current || '',
                  sender: 'system',
                  text: warnText,
                  createdAt: Date.now(),
                },
              ]);
              break;
            }

            case 'chat:ended': {
              // Immediately wipe chat messages and partner nickname from client state
              const reason = String(payload.reason || 'partner_left');
              setMessages([]);
              setMatch(null);
              setPartnerTyping(false);
              setReportOpen(false);
              if (reason === 'self_left') {
                setEndedNotice(tr.chat.endedBySelf);
              } else if (reason === 'session_restricted') {
                setEndedNotice(tr.chat.endedRestricted);
              } else {
                setEndedNotice(tr.chat.endedByPartner);
              }
              break;
            }

            case 'session:terminated': {
              const reason =
                typeof payload.reason === 'string'
                  ? payload.reason
                  : 'Oturumunuz güvenlik gerekçesiyle sonlandırıldı.';
              setMessages([]);
              setMatch(null);
              setPartnerTyping(false);
              setReportOpen(false);
              setPhase('lobby');
              setLobbyError(reason);
              pushToast(reason);
              break;
            }

            case 'report:resolved': {
              const text =
                typeof payload.text === 'string'
                  ? payload.text
                  : 'İnceleme tamamlandı, gerekli işlem yapıldı.';
              pushToast(text);
              break;
            }

            default:
              break;
          }
        };

        ws.onclose = () => {
          if (wsRef.current === ws) {
            wsRef.current = null;
          }
        };
      });
    },
    [pushToast],
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  function handleToggleInterest(tag: string) {
    setSelectedInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((x) => x !== tag);
      if (prev.length >= 6) return prev;
      return [...prev, tag];
    });
  }

  async function handleStartMatching() {
    setLobbyError(null);
    if (
      !consentState.ageConfirmed ||
      !consentState.termsAccepted ||
      !consentState.privacyAccepted ||
      !consentState.cookieAccepted
    ) {
      setLobbyError(tr.consent.missingError);
      return;
    }

    setConsentLoading(true);
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...consentState,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLobbyError(data.error || 'Onay kaydedilemedi.');
        return;
      }

      const sid = String(data.sessionId);
      setSessionId(sid);
      setConsentTimestamp(data.acceptedAt);
      setDailyRemaining(data.dailyRemaining);
      try {
        window.localStorage.setItem(
          CONSENT_STORAGE_KEY,
          JSON.stringify({
            accepted: true,
            sessionId: sid,
            acceptedAt: data.acceptedAt,
          }),
        );
      } catch {
        // ignore storage restrictions
      }

      const ws = await ensureWebSocket(sid);
      ws.send(
        JSON.stringify({
          event: 'match:join',
          payload: {
            interests: selectedInterests,
            customNickname: nickname.trim() || null,
          },
        }),
      );
      setPhase('matching');
    } catch (err) {
      setLobbyError(
        err instanceof Error
          ? err.message
          : 'Bağlantı hatası oluştu. Tekrar deneyin.',
      );
    } finally {
      setConsentLoading(false);
    }
  }

  function handleCancelMatching() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'match:cancel', payload: {} }));
    }
    setPhase('lobby');
  }

  function handleSendMessage(text: string, hasAttachmentFlag?: boolean) {
    if (!match || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        event: 'chat:message',
        payload: {
          roomId: match.roomId,
          text,
          hasAttachment: Boolean(hasAttachmentFlag),
        },
      }),
    );
  }

  function handleTypingChange(typing: boolean) {
    if (!match || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        event: 'chat:typing',
        payload: { roomId: match.roomId, isTyping: typing },
      }),
    );
  }

  function handleEndChat() {
    if (match && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ event: 'chat:leave', payload: { roomId: match.roomId } }),
      );
    }
    setMessages([]);
    setMatch(null);
    setEndedNotice(tr.chat.endedBySelf);
  }

  function handleBlockPartner() {
    if (match && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'user:block',
          payload: { roomId: match.roomId },
        }),
      );
    }
    setMessages([]);
    setMatch(null);
    setEndedNotice(tr.chat.endedBySelf);
    pushToast('Kullanıcı sessizce engellendi ve bir daha eşleştirilmeyeceksiniz.');
  }

  async function handleNewMatch() {
    if (!sessionId) {
      setPhase('lobby');
      return;
    }
    setMessages([]);
    setMatch(null);
    setEndedNotice(null);
    setPartnerTyping(false);

    try {
      const ws = await ensureWebSocket(sessionId);
      ws.send(
        JSON.stringify({
          event: 'match:join',
          payload: {
            interests: selectedInterests,
            customNickname: nickname.trim() || null,
          },
        }),
      );
      setPhase('matching');
    } catch {
      setPhase('lobby');
    }
  }

  async function handleDeleteData() {
    try {
      let msg = 'Verileriniz silindi.';
      if (sessionId) {
        const res = await fetch('/api/session/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (data?.message) msg = data.message;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      try {
        window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      } catch {
        // ignore
      }
      setSessionId(null);
      setConsentTimestamp(null);
      setDailyRemaining(null);
      setMatch(null);
      setMessages([]);
      setEndedNotice(null);
      setNickname('');
      setSelectedInterests([]);
      setConsentState({
        ageConfirmed: false,
        termsAccepted: false,
        privacyAccepted: false,
        cookieAccepted: false,
      });
      setPhase('lobby');
      pushToast(msg);
    } catch {
      pushToast('Veri silme işlemi sırasında hata oluştu.');
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden flex flex-col bg-[#EFEAE2] text-[#111B21] dark:bg-[#0B141A] dark:text-[#E9EDEF] transition-colors">
      {/* WhatsApp-toned 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#008069]/95 backdrop-blur-md text-white dark:bg-[#202C33]/92 dark:text-[#E9EDEF] border-b border-black/10 dark:border-white/8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={navigateHome}
            className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-white dark:text-[#E9EDEF] whitespace-nowrap shrink-0"
          >
            <FisiltiLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            <span>{tr.brand.name}</span>
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="flex items-center gap-3 sm:gap-7 text-xs sm:text-sm font-medium text-white/90 dark:text-[#AEBAC1]">
            <button
              type="button"
              onClick={navigateHome}
              className={`min-h-[36px] px-1 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                route === 'home' ? 'text-white font-semibold' : ''
              }`}
            >
              {tr.nav.home}
            </button>
            <button
              type="button"
              onClick={navigatePromo}
              className={`min-h-[36px] px-1 hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                route === 'promo' ? 'text-white font-semibold' : ''
              }`}
            >
              {tr.nav.promo}
            </button>
            <button
              type="button"
              onClick={() => setLegalDoc('privacy')}
              className="min-h-[36px] px-1 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {tr.nav.rules}
            </button>
          </nav>

          {/* Zone 3: Single theme action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              aria-label={darkMode ? tr.nav.lightMode : tr.nav.darkMode}
              className="min-h-[40px] px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 dark:bg-[#2A3942] dark:hover:bg-[#374854] text-xs font-medium text-white dark:text-[#E9EDEF] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">{tr.nav.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">{tr.nav.darkMode}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {route === 'admin' ? (
          <AdminPanelView />
        ) : route === 'promo' ? (
          <PromoVideoView onStartApp={navigateHome} />
        ) : phase === 'lobby' ? (
          <ConsentLobbyView
            activeUsers={activeUsers}
            sessionId={sessionId}
            consentTimestamp={consentTimestamp}
            dailyRemaining={dailyRemaining}
            nickname={nickname}
            selectedInterests={selectedInterests}
            consentState={consentState}
            error={lobbyError}
            loading={consentLoading}
            onNicknameChange={setNickname}
            onToggleInterest={handleToggleInterest}
            onConsentChange={(patch) =>
              setConsentState((prev) => ({ ...prev, ...patch }))
            }
            onOpenLegal={(doc) => setLegalDoc(doc)}
            onOpenPromo={navigatePromo}
            onStartMatching={handleStartMatching}
            onDeleteData={handleDeleteData}
          />
        ) : phase === 'matching' ? (
          <MatchingView
            activeUsers={activeUsers}
            selectedInterests={selectedInterests}
            onCancel={handleCancelMatching}
          />
        ) : (
          <ChatView
            match={match}
            messages={messages}
            partnerTyping={partnerTyping}
            endedNotice={endedNotice}
            muted={muted}
            onToggleMute={() => setMuted((v) => !v)}
            onSendMessage={handleSendMessage}
            onTypingChange={handleTypingChange}
            onOpenReport={() => setReportOpen(true)}
            onBlockPartner={handleBlockPartner}
            onEndChat={handleEndChat}
            onNewMatch={handleNewMatch}
            onReturnLobby={() => {
              setMessages([]);
              setMatch(null);
              setEndedNotice(null);
              setPhase('lobby');
            }}
          />
        )}
      </main>

      {/* Modals */}
      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />

      {match && sessionId && (
        <ReportModal
          open={reportOpen}
          roomId={match.roomId}
          sessionId={sessionId}
          partnerAlias={match.partnerAlias}
          onClose={() => setReportOpen(false)}
          onSubmitted={(msg) => {
            setReportOpen(false);
            setMessages([]);
            setMatch(null);
            setEndedNotice(tr.chat.endedBySelf);
            pushToast(msg);
          }}
        />
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm pb-[env(safe-area-inset-bottom)]"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#161B1E] shadow-lg px-4 py-3 flex items-start gap-3 text-sm text-slate-800 dark:text-slate-100"
            >
              <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{t.text}</span>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                aria-label="Bildirimi kapat"
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
