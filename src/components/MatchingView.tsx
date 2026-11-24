import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, Users, X } from 'lucide-react';
import { tr } from '../i18n';
import { AnonAvatar, FisiltiLogo } from './BrandMark';
import { WhisperCanvas } from './WhisperCanvas';

const SEARCH_MESSAGES = [
  'Çevrimiçi anonim kullanıcılar taranıyor...',
  'Ortak ilgi alanlarına göre en uygun eşleşme seçiliyor...',
  'Uçtan uca güvenli sohbet odası hazırlanıyor...',
];

const SEARCH_STEPS = ['Kanal Açıldı', 'Eşleşme Aranıyor', 'Güvenli Oda'];

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function MatchingView({
  activeUsers,
  selectedInterests,
  onCancel,
}: {
  activeUsers: number | null;
  selectedInterests: string[];
  onCancel: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const rot = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % SEARCH_MESSAGES.length);
    }, 2800);
    return () => clearInterval(rot);
  }, []);

  const activeStep = Math.min(2, Math.floor(elapsedSec / 3));

  return (
    <div className="relative overflow-hidden min-h-[calc(100dvh-56px)] sm:min-h-[calc(100dvh-64px)] flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10">
      <WhisperCanvas intensity="active" />

      <motion.div
        initial={
          prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/10 bg-white/82 dark:bg-[#111B21]/82 backdrop-blur-xl p-6 sm:p-10 text-center space-y-6 sm:space-y-7 shadow-[0_24px_80px_-24px_rgba(0,168,132,0.35)]"
      >
        {/* Multi-layered Volumetric Radar & Orbiting Nodes */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 mx-auto flex items-center justify-center">
          {/* Volumetric emerald aurora */}
          <motion.div
            aria-hidden="true"
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [0.92, 1.08, 0.92], opacity: [0.45, 0.75, 0.45] }
            }
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-8 rounded-full bg-[#00A884]/25 dark:bg-[#25D366]/20 blur-2xl"
          />

          {/* Smooth expanding sonar waves */}
          {!prefersReducedMotion &&
            [0, 0.9, 1.8].map((delay, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                initial={{ scale: 0.45, opacity: 0.65 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{
                  duration: 2.7,
                  repeat: Infinity,
                  delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute inset-8 rounded-full border border-[#00A884]/60 dark:border-[#25D366]/55"
              />
            ))}

          {/* Counter-rotating precision SVG radar rings */}
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full"
            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="110"
              cy="110"
              r="98"
              fill="none"
              stroke="currentColor"
              className="text-[#00A884]/20 dark:text-[#25D366]/20"
              strokeWidth="1"
              strokeDasharray="6 10"
            />
            <path
              d="M110 12 A98 98 0 0 1 196 62"
              fill="none"
              stroke="#00A884"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </motion.svg>

          <motion.svg
            aria-hidden="true"
            viewBox="0 0 220 220"
            className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)]"
            animate={prefersReducedMotion ? undefined : { rotate: -360 }}
            transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="110"
              cy="110"
              r="92"
              fill="none"
              stroke="currentColor"
              className="text-[#008069]/25 dark:text-[#00A884]/25"
              strokeWidth="1.2"
              strokeDasharray="3 8"
            />
            <path
              d="M110 202 A92 92 0 0 1 28 152"
              fill="none"
              stroke="#25D366"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.75"
            />
          </motion.svg>

          {/* Orbiting anonymous nodes (upright via counter-rotation) */}
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-3"
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/80 dark:ring-[#111B21]"
              >
                <AnonAvatar seed="whisper_node_1" size={30} />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute bottom-3 left-3 rounded-full ring-2 ring-white/80 dark:ring-[#111B21]"
              >
                <AnonAvatar seed="whisper_node_2" size={26} />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute bottom-3 right-3 rounded-full ring-2 ring-white/80 dark:ring-[#111B21]"
              >
                <AnonAvatar seed="whisper_node_3" size={26} />
              </motion.div>
            </motion.div>
          )}

          {/* Center Glass Pedestal & Sculpted Shushing Emblem */}
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [1, 1.05, 1] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 w-24 h-24 rounded-3xl bg-white/95 dark:bg-[#1B272F] border border-[#00A884]/45 dark:border-[#25D366]/45 flex items-center justify-center shadow-[0_12px_36px_-8px_rgba(0,168,132,0.5)]"
          >
            <FisiltiLogo className="w-16 h-16" />
          </motion.div>
        </div>

        {/* Acoustic Whisper Waveform + Clean Unboxed Metadata */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            {/* Live Acoustic Bars */}
            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-1 h-4"
            >
              {[0.45, 0.85, 1, 0.7, 0.9, 0.55].map((peak, idx) => (
                <motion.span
                  key={idx}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { scaleY: [0.35, peak, 0.35] }
                  }
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: idx * 0.12,
                    ease: 'easeInOut',
                  }}
                  className="w-[3px] h-full rounded-full bg-[#00A884] dark:bg-[#25D366] origin-center"
                />
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#008069] dark:text-[#25D366]">
              <span className="font-semibold">Aranıyor</span>
              <span aria-hidden="true">·</span>
              <span className="font-bold">{formatElapsed(elapsedSec)}</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111B21] dark:text-[#E9EDEF] [text-wrap:balance]">
            {tr.matching.title}
          </h2>

          <div className="min-h-[42px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-xs sm:text-sm text-[#54656F] dark:text-[#9CB0BA] max-w-sm mx-auto leading-relaxed"
              >
                {selectedInterests.length > 0 && phraseIndex === 1
                  ? `Ortak etiketler: ${selectedInterests.join(' · ')}`
                  : SEARCH_MESSAGES[phraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Animated 3-Step Matching Progress Strip */}
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="relative h-1.5 rounded-full bg-[#E9EDEF] dark:bg-[#202C33] overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#008069] via-[#00A884] to-[#25D366]"
              animate={{ width: `${((activeStep + 1) / 3) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
            {!prefersReducedMotion && (
              <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-cta-sheen" />
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-[#54656F] dark:text-[#8696A0]">
            {SEARCH_STEPS.map((label, idx) => (
              <span
                key={label}
                className={
                  idx <= activeStep
                    ? 'text-[#008069] dark:text-[#25D366] font-semibold'
                    : ''
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Unboxed Clean Presence & Privacy Readout */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-[#54656F] dark:text-[#8696A0] pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#00A884]" />
            <span className="font-mono tabular-nums font-semibold text-[#111B21] dark:text-[#E9EDEF]">
              {activeUsers === null ? '—' : activeUsers}
            </span>
            <span>{tr.presence.activeUsersLabel}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A884]" />
            <span>Anonim &amp; Şifreli Kanal</span>
          </span>
        </div>

        {/* Spring-Animated Cancel Action */}
        <div className="pt-1">
          <motion.button
            type="button"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            onClick={onCancel}
            className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-8 py-2.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5]/90 dark:bg-[#202C33]/90 text-sm font-medium text-[#111B21] dark:text-[#E9EDEF] hover:bg-[#E9EDEF] dark:hover:bg-[#2A3942] transition-colors whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            <span>{tr.matching.cancelButton}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
