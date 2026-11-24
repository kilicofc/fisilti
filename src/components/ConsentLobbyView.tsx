import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  PlayCircle,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { tr } from '../i18n';
import { FisiltiLogo } from './BrandMark';
import type { LegalDocType } from './LegalModal';
import { WhisperCanvas } from './WhisperCanvas';

export interface ConsentFormState {
  ageConfirmed: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cookieAccepted: boolean;
}

function AnimatedCheck({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? 'bg-[#00A884] border-[#00A884] text-white shadow-xs'
          : 'border-[#B6C2C9] dark:border-[#3B4A54] bg-white dark:bg-[#111B21]'
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
    </span>
  );
}

export function ConsentLobbyView({
  activeUsers,
  sessionId,
  consentTimestamp,
  dailyRemaining,
  nickname,
  selectedInterests,
  consentState,
  error,
  loading,
  onNicknameChange,
  onToggleInterest,
  onConsentChange,
  onOpenLegal,
  onOpenPromo,
  onStartMatching,
  onDeleteData,
}: {
  activeUsers: number | null;
  sessionId: string | null;
  consentTimestamp: string | null;
  dailyRemaining: number | null;
  nickname: string;
  selectedInterests: string[];
  consentState: ConsentFormState;
  error: string | null;
  loading: boolean;
  onNicknameChange: (val: string) => void;
  onToggleInterest: (tag: string) => void;
  onConsentChange: (patch: Partial<ConsentFormState>) => void;
  onOpenLegal: (doc: LegalDocType) => void;
  onOpenPromo: () => void;
  onStartMatching: () => void;
  onDeleteData: () => void;
}) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reduceMotion = useReducedMotion();

  const allConsented =
    consentState.ageConfirmed &&
    consentState.termsAccepted &&
    consentState.privacyAccepted &&
    consentState.cookieAccepted;
  const hasSavedConsent = Boolean(consentTimestamp) && allConsented;

  return (
    <div className="relative overflow-hidden min-h-[calc(100dvh-56px)] sm:min-h-[calc(100dvh-64px)]">
      <WhisperCanvas intensity="ambient" />

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* Top-left Hero Identity (compact on mobile, editorial on desktop) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-4 sm:space-y-6 text-center lg:text-left pt-1 sm:pt-3"
          >
            {/* Unboxed Live Presence Readout */}
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#008069] dark:text-[#25D366] font-medium">
              <Radio className="w-4 h-4 shrink-0" />
              <span className="font-mono tabular-nums font-bold">
                {activeUsers === null ? '—' : activeUsers}
              </span>
              <span>{tr.presence.activeUsersLabel}</span>
              <span aria-hidden="true" className="text-[#8696A0]">
                ·
              </span>
              <span className="text-[#54656F] dark:text-[#8696A0] font-normal">
                Anonim ağ
              </span>
            </div>

            {/* Logo + Headline */}
            <div className="flex flex-col lg:items-start items-center gap-3">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, -3, 0] }
                }
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-3xl bg-[#00A884]/20 blur-xl"
                />
                <FisiltiLogo className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-md" />
              </motion.div>

              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111B21] dark:text-[#E9EDEF] [text-wrap:balance] leading-tight">
                {tr.lobby.headline}
              </h1>
              <p className="text-xs sm:text-base text-[#54656F] dark:text-[#9CB0BA] max-w-md leading-relaxed">
                {tr.lobby.subheadline}
              </p>

              <button
                type="button"
                onClick={onOpenPromo}
                className="min-h-[40px] inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#008069] dark:text-[#25D366] hover:underline underline-offset-4 transition-colors"
              >
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span>Sesli Tanıtım Videosunu İzle</span>
              </button>
            </div>

            {/* Desktop Storytelling Pillars (hidden below consent card on mobile for instant thumb CTA) */}
            <div className="hidden lg:block pt-2 space-y-0 divide-y divide-[#D1D7DB]/70 dark:divide-[#2A3942]/80 border-t border-[#D1D7DB]/70 dark:border-[#2A3942]/80">
              {tr.lobby.introPillars.map((pillar) => (
                <div key={pillar.title} className="py-4 space-y-1">
                  <h2 className="text-sm font-semibold text-[#008069] dark:text-[#25D366]">
                    {pillar.title}
                  </h2>
                  <p className="text-xs text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right / Primary Action Glass Card */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 rounded-3xl border border-black/10 dark:border-white/10 bg-white/88 dark:bg-[#202C33]/88 backdrop-blur-xl shadow-[0_20px_60px_-24px_rgba(0,0,0,0.28)] p-4 sm:p-7 space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#E9EDEF] dark:border-[#2A3942]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
                <span>
                  {hasSavedConsent ? 'Hızlı Giriş Hazır' : tr.consent.sectionTitle}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#54656F] dark:text-[#8696A0]">
                <Lock className="w-3 h-3 text-[#00A884]" />
                <span>Kayıtsız giriş</span>
              </span>
            </div>

            {hasSavedConsent ? (
              <div className="rounded-2xl border border-[#00A884]/35 bg-[#E7FCE3]/60 dark:bg-[#005C4B]/25 px-4 py-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#008069] dark:text-[#25D366]">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>18+ Yaş, Kurallar, KVKK ve Çerez onayların kayıtlı.</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#54656F] dark:text-[#9CB0BA]">
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="hover:text-[#008069] dark:hover:text-[#25D366] underline underline-offset-2"
                  >
                    {tr.consent.termsLink}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="hover:text-[#008069] dark:hover:text-[#25D366] underline underline-offset-2"
                  >
                    {tr.consent.privacyLink}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 4 Mandatory Tactile Checkboxes */}
                <div className="space-y-2">
                  <label className="min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E9EDEF] dark:border-[#2A3942] bg-[#F8FAFB]/80 dark:bg-[#111B21]/65 hover:border-[#00A884]/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={consentState.ageConfirmed}
                      onChange={(e) =>
                        onConsentChange({ ageConfirmed: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <AnimatedCheck checked={consentState.ageConfirmed} />
                    <span className="text-xs sm:text-sm text-[#111B21] dark:text-[#E9EDEF] leading-snug">
                      {tr.consent.ageLabel}
                    </span>
                  </label>

                  <div className="min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E9EDEF] dark:border-[#2A3942] bg-[#F8FAFB]/80 dark:bg-[#111B21]/65 hover:border-[#00A884]/50 transition-colors">
                    <label
                      htmlFor="consent-terms"
                      className="flex items-center cursor-pointer shrink-0"
                    >
                      <input
                        id="consent-terms"
                        type="checkbox"
                        checked={consentState.termsAccepted}
                        onChange={(e) =>
                          onConsentChange({ termsAccepted: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <AnimatedCheck checked={consentState.termsAccepted} />
                    </label>
                    <div className="text-xs sm:text-sm text-[#111B21] dark:text-[#E9EDEF] leading-snug">
                      <label htmlFor="consent-terms" className="cursor-pointer">
                        {tr.consent.termsPrefix}{' '}
                      </label>
                      <button
                        type="button"
                        onClick={() => onOpenLegal('terms')}
                        className="text-[#008069] dark:text-[#25D366] underline underline-offset-2 font-medium"
                      >
                        {tr.consent.termsLink}
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E9EDEF] dark:border-[#2A3942] bg-[#F8FAFB]/80 dark:bg-[#111B21]/65 hover:border-[#00A884]/50 transition-colors">
                    <label
                      htmlFor="consent-privacy"
                      className="flex items-center cursor-pointer shrink-0"
                    >
                      <input
                        id="consent-privacy"
                        type="checkbox"
                        checked={consentState.privacyAccepted}
                        onChange={(e) =>
                          onConsentChange({ privacyAccepted: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <AnimatedCheck checked={consentState.privacyAccepted} />
                    </label>
                    <div className="text-xs sm:text-sm text-[#111B21] dark:text-[#E9EDEF] leading-snug">
                      <label htmlFor="consent-privacy" className="cursor-pointer">
                        {tr.consent.privacyPrefix}{' '}
                      </label>
                      <button
                        type="button"
                        onClick={() => onOpenLegal('privacy')}
                        className="text-[#008069] dark:text-[#25D366] underline underline-offset-2 font-medium"
                      >
                        {tr.consent.privacyLink}
                      </button>
                    </div>
                  </div>

                  <label className="min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E9EDEF] dark:border-[#2A3942] bg-[#F8FAFB]/80 dark:bg-[#111B21]/65 hover:border-[#00A884]/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={consentState.cookieAccepted}
                      onChange={(e) =>
                        onConsentChange({ cookieAccepted: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <AnimatedCheck checked={consentState.cookieAccepted} />
                    <span className="text-xs sm:text-sm text-[#111B21] dark:text-[#E9EDEF] leading-snug">
                      {tr.consent.cookieLabel}
                    </span>
                  </label>
                </div>

                {/* Short Safety Warning */}
                <div className="rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/85 dark:bg-amber-950/30 px-3.5 py-2.5 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-950 dark:text-amber-100 leading-snug">
                    {tr.consent.warningBox}
                  </p>
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            {/* Shimmering WhatsApp Primary CTA */}
            <motion.button
              type="button"
              disabled={!allConsented || loading}
              whileHover={
                !allConsented || loading || reduceMotion
                  ? undefined
                  : { scale: 1.01 }
              }
              whileTap={
                !allConsented || loading || reduceMotion
                  ? undefined
                  : { scale: 0.985 }
              }
              onClick={onStartMatching}
              className="relative overflow-hidden w-full min-h-[52px] px-6 py-3 rounded-full bg-gradient-to-r from-[#008069] via-[#00A884] to-[#12B886] hover:brightness-105 disabled:from-[#D1D7DB] disabled:to-[#D1D7DB] dark:disabled:from-[#2A3942] dark:disabled:to-[#2A3942] disabled:text-[#667781] dark:disabled:text-[#8696A0] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(0,168,132,0.7)] disabled:shadow-none transition-all whitespace-nowrap"
            >
              {allConsented && !loading && !reduceMotion && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-cta-sheen"
                />
              )}
              <span className="relative z-10">
                {loading ? 'Hazırlanıyor...' : tr.lobby.startButton}
              </span>
              <ArrowRight className="relative z-10 w-4 h-4" />
            </motion.button>

            <p className="text-center text-[11px] text-[#54656F] dark:text-[#8696A0] leading-relaxed">
              {tr.privacyBanner.statement}
            </p>

            {/* Smooth Collapsible Preferences */}
            <div className="pt-2 border-t border-[#E9EDEF] dark:border-[#2A3942]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreferences((v) => !v)}
                  className="min-h-[40px] inline-flex items-center gap-2 text-xs font-medium text-[#54656F] dark:text-[#9CB0BA] hover:text-[#008069] dark:hover:text-[#25D366] transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    Takma Ad ve İlgi Alanı Seç (İsteğe Bağlı
                    {selectedInterests.length > 0
                      ? ` · ${selectedInterests.length} seçili`
                      : ''}
                    )
                  </span>
                  <motion.span
                    animate={{ rotate: showPreferences ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </button>

                {consentTimestamp && dailyRemaining !== null && (
                  <span className="text-[11px] font-mono tabular-nums text-[#54656F] dark:text-[#8696A0]">
                    Kalan hak: {dailyRemaining}
                  </span>
                )}
              </div>

              <AnimatePresence initial={false}>
                {showPreferences && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4 pt-3 border-t border-[#E9EDEF] dark:border-[#2A3942]">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="nickname-input"
                          className="block text-xs font-semibold text-[#111B21] dark:text-[#E9EDEF]"
                        >
                          {tr.lobby.nicknameLabel}
                        </label>
                        <input
                          id="nickname-input"
                          type="text"
                          maxLength={24}
                          value={nickname}
                          onChange={(e) => onNicknameChange(e.target.value)}
                          placeholder={tr.lobby.nicknamePlaceholder}
                          className="w-full min-h-[44px] rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5] dark:bg-[#111B21] px-3.5 py-2 text-base sm:text-sm text-[#111B21] dark:text-[#E9EDEF] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                            {tr.lobby.interestsLabel}
                          </span>
                          <span className="font-mono tabular-nums text-[#54656F] dark:text-[#8696A0]">
                            {selectedInterests.length}/6
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tr.interests.map((tag) => {
                            const active = selectedInterests.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => onToggleInterest(tag)}
                                aria-pressed={active}
                                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                                  active
                                    ? 'bg-[#00A884] border-[#00A884] text-white shadow-xs'
                                    : 'bg-[#F0F2F5] dark:bg-[#111B21] border-[#D1D7DB] dark:border-[#2A3942] text-[#111B21] dark:text-[#E9EDEF] hover:border-[#00A884]'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {sessionId && (
                <div className="mt-3 pt-3 border-t border-[#E9EDEF] dark:border-[#2A3942] flex flex-wrap items-center justify-between gap-2">
                  {consentTimestamp && (
                    <span className="text-[11px] text-[#54656F] dark:text-[#8696A0] font-mono tabular-nums">
                      {tr.lobby.consentRecordedAt}:{' '}
                      {new Date(consentTimestamp).toLocaleString('tr-TR')}
                    </span>
                  )}

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="min-h-[36px] inline-flex items-center gap-1.5 text-xs text-[#54656F] dark:text-[#8696A0] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr.lobby.deleteDataButton}</span>
                    </button>
                  ) : (
                    <div className="w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/25 p-3 space-y-2">
                      <p className="text-xs text-rose-800 dark:text-rose-200">
                        {tr.lobby.deleteDataConfirm}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete(false);
                            onDeleteData();
                          }}
                          className="min-h-[36px] px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium whitespace-nowrap"
                        >
                          Evet, Verilerimi Sil
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="min-h-[36px] px-3 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium text-[#111B21] dark:text-[#E9EDEF] whitespace-nowrap"
                        >
                          {tr.chat.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Mobile Pillars Below Consent Card */}
        <div className="lg:hidden mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tr.lobby.introPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#202C33]/80 backdrop-blur-md p-4 space-y-1"
            >
              <h2 className="text-sm font-semibold text-[#008069] dark:text-[#25D366]">
                {pillar.title}
              </h2>
              <p className="text-xs text-[#54656F] dark:text-[#9CB0BA] leading-relaxed">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
