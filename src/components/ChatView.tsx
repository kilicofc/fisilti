import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Ban,
  Check,
  CheckCheck,
  Flag,
  LogOut,
  RefreshCw,
  Send,
  Smile,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { tr } from '../i18n';
import type { ChatMessage, MatchInfo } from '../types/chat';
import { AnonAvatar } from './BrandMark';

const EMOJI_LIST = [
  '😀',
  '😄',
  '😅',
  '😊',
  '😉',
  '🤔',
  '😎',
  '🥳',
  '😮',
  '😢',
  '🙏',
  '👍',
  '👏',
  '🔥',
  '✨',
  '🎧',
  '🎬',
  '📚',
  '☕',
  '🌿',
  '💬',
  '💡',
  '🌙',
  '❤️',
];

function formatDayLabel(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return tr.chat.todayDivider;
  }
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatView({
  match,
  messages,
  partnerTyping,
  endedNotice,
  muted,
  onToggleMute,
  onSendMessage,
  onTypingChange,
  onOpenReport,
  onBlockPartner,
  onEndChat,
  onNewMatch,
  onReturnLobby,
}: {
  match: MatchInfo | null;
  messages: ChatMessage[];
  partnerTyping: boolean;
  endedNotice: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onSendMessage: (text: string, hasAttachmentFlag?: boolean) => void;
  onTypingChange: (typing: boolean) => void;
  onOpenReport: () => void;
  onBlockPartner: () => void;
  onEndChat: () => void;
  onNewMatch: () => void;
  onReturnLobby: () => void;
}) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, partnerTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  function emitTyping(nextTyping: boolean) {
    if (isTypingRef.current !== nextTyping) {
      isTypingRef.current = nextTyping;
      onTypingChange(nextTyping);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (nextTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTypingChange(false);
      }, 2200);
    }
  }

  function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !match || endedNotice) return;
    onSendMessage(text);
    setInput('');
    setShowEmojis(false);
    emitTyping(false);
  }

  function handlePasteOrDrop(
    e: React.ClipboardEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
  ) {
    const items =
      'clipboardData' in e ? e.clipboardData?.items : e.dataTransfer?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        e.preventDefault();
        setAttachmentNotice(tr.chat.textOnlyNotice);
        onSendMessage('', true);
        setTimeout(() => setAttachmentNotice(null), 3500);
        return;
      }
    }
  }

  let lastDay = '';

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto px-0 sm:px-4 py-0 sm:py-4 flex flex-col h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)]"
      onDrop={handlePasteOrDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex-1 min-h-0 flex flex-col sm:rounded-3xl border-y sm:border border-black/10 dark:border-white/10 bg-[#EFEAE2] dark:bg-[#0B141A] overflow-hidden shadow-xl">
        {/* Glassmorphic WhatsApp Chat Header */}
        <div className="shrink-0 bg-[#F0F2F5]/95 dark:bg-[#202C33]/95 backdrop-blur-md border-b border-[#D1D7DB] dark:border-[#2A3942] px-2.5 sm:px-5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {match ? (
                <>
                  <AnonAvatar seed={match.partnerAvatarSeed} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-[#111B21] dark:text-[#E9EDEF] truncate">
                      {match.partnerAlias}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#54656F] dark:text-[#8696A0] truncate">
                      {partnerTyping ? (
                        <span className="text-[#00A884] font-medium">
                          {tr.chat.typingIndicator}
                        </span>
                      ) : match.sharedInterests.length > 0 ? (
                        `${tr.chat.sharedInterestsPrefix} · ${match.sharedInterests.join(' · ')}`
                      ) : (
                        tr.chat.randomMatchLabel
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-[#111B21] dark:text-[#E9EDEF] truncate">
                    Sohbet Sonlandı
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#54656F] dark:text-[#8696A0] truncate">
                    Karşı taraf bilgisi ve geçmiş temizlendi
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleMute}
                title={muted ? tr.chat.soundOff : tr.chat.soundOn}
                aria-label={muted ? tr.chat.soundOff : tr.chat.soundOn}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-[#54656F] dark:text-[#AEBAC1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00A884]" />
                )}
              </button>

              {match && !endedNotice && (
                <>
                  <button
                    type="button"
                    onClick={onOpenReport}
                    aria-label={tr.chat.reportButton}
                    className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-full bg-rose-600/12 hover:bg-rose-600/20 text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline sm:inline">
                      {tr.chat.reportButton}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmBlock((v) => !v)}
                    aria-label={tr.chat.blockButton}
                    className="min-h-[40px] min-w-[40px] sm:px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#111B21] dark:text-[#E9EDEF] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tr.chat.blockButton}</span>
                  </button>
                </>
              )}

              <motion.button
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                onClick={onNewMatch}
                className="min-h-[40px] px-3 sm:px-4 py-1.5 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tr.chat.newMatchButton}</span>
                <span className="sm:hidden">Yeni</span>
              </motion.button>

              {match && !endedNotice && (
                <button
                  type="button"
                  onClick={onEndChat}
                  aria-label={tr.chat.endChatButton}
                  className="min-h-[40px] min-w-[40px] sm:px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#111B21] dark:text-[#E9EDEF] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {tr.chat.endChatButton}
                  </span>
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {confirmBlock && match && !endedNotice && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#111B21] p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#111B21] dark:text-[#E9EDEF]">
                    <span className="font-semibold">{tr.chat.blockConfirmTitle}: </span>
                    <span className="text-[#54656F] dark:text-[#8696A0]">
                      {tr.chat.blockConfirmText}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmBlock(false);
                        onBlockPartner();
                      }}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      {tr.chat.blockConfirmButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBlock(false)}
                      className="min-h-[36px] px-3 py-1.5 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-xs font-medium text-[#111B21] dark:text-[#E9EDEF] whitespace-nowrap"
                    >
                      {tr.chat.cancel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WhatsApp Doodle-Patterned Chat Canvas */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-8 py-4 space-y-2.5 wa-wallpaper-light wa-wallpaper-dark">
          {match && !endedNotice && messages.length === 0 && (
            <motion.div
              initial={
                prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="my-6 text-center max-w-md mx-auto rounded-2xl border border-black/5 dark:border-white/8 bg-white/95 dark:bg-[#182229]/95 backdrop-blur-md px-5 py-5 shadow-sm space-y-3"
            >
              <p className="text-sm font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                {match.partnerAlias} ile anonim olarak eşleştiniz
              </p>
              <p className="text-xs text-[#54656F] dark:text-[#8696A0] leading-relaxed">
                Bu sohbetteki geçici adınız:{' '}
                <span className="font-semibold text-[#008069] dark:text-[#25D366]">
                  {match.selfAlias}
                </span>
                . Kişisel bilgi paylaşmayın.
              </p>
              <motion.button
                type="button"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => setShowIcebreakers(true)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buz Kırıcı Soru Seç</span>
              </motion.button>
            </motion.div>
          )}

          {messages.map((msg) => {
            const dayLabel = formatDayLabel(msg.createdAt);
            const showDivider = dayLabel !== lastDay;
            lastDay = dayLabel;

            return (
              <React.Fragment key={msg.id}>
                {showDivider && (
                  <div className="flex items-center justify-center py-2">
                    <span className="rounded-lg bg-white/92 dark:bg-[#182229]/92 px-3 py-1 text-[11px] font-medium text-[#54656F] dark:text-[#8696A0] shadow-xs">
                      {dayLabel}
                    </span>
                  </div>
                )}

                {msg.sender === 'system' ? (
                  <div className="flex justify-center py-1">
                    <p className="max-w-lg text-center text-xs text-amber-900 dark:text-amber-200 bg-amber-100/95 dark:bg-[#182229] border border-amber-300/60 dark:border-amber-800/60 rounded-xl px-3.5 py-2 shadow-xs">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 8,
                            scale: 0.95,
                            x: msg.sender === 'self' ? 8 : -8,
                          }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                    }}
                    className={`flex ${
                      msg.sender === 'self' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[84%] sm:max-w-[68%] rounded-xl px-3 py-1.5 text-sm leading-relaxed shadow-xs break-words ${
                        msg.sender === 'self'
                          ? 'wa-bubble-self bg-[#D9FDD3] text-[#111B21] dark:bg-[#005C4B] dark:text-[#E9EDEF] rounded-tr-none'
                          : 'wa-bubble-partner bg-white text-[#111B21] dark:bg-[#202C33] dark:text-[#E9EDEF] rounded-tl-none'
                      }`}
                    >
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                      <span
                        className={`inline-flex items-center gap-1 float-right ml-3 mt-1.5 text-[10px] font-mono tabular-nums ${
                          msg.sender === 'self'
                            ? 'text-[#54656F] dark:text-[#99BEB7]'
                            : 'text-[#667781] dark:text-[#8696A0]'
                        }`}
                      >
                        <span>{formatTime(msg.createdAt)}</span>
                        {msg.sender === 'self' &&
                          (msg.readByPartner ? (
                            <CheckCheck
                              className="w-3.5 h-3.5 text-[#53BDEB]"
                              aria-label="Okundu"
                            />
                          ) : (
                            <Check
                              className="w-3.5 h-3.5"
                              aria-label="İletildi"
                            />
                          ))}
                      </span>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}

          {/* Animated 3-dot WhatsApp typing bubble */}
          <AnimatePresence>
            {partnerTyping && match && !endedNotice && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                className="flex justify-start"
              >
                <div className="wa-bubble-partner rounded-xl rounded-tl-none bg-white dark:bg-[#202C33] px-3.5 py-2.5 flex items-center gap-1.5 shadow-xs">
                  {[0, 0.16, 0.32].map((d, idx) => (
                    <motion.span
                      key={idx}
                      animate={
                        prefersReducedMotion
                          ? undefined
                          : { y: [0, -4, 0], opacity: [0.45, 1, 0.45] }
                      }
                      transition={{
                        duration: 0.75,
                        repeat: Infinity,
                        delay: d,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-[#00A884]"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {endedNotice && (
            <motion.div
              initial={
                prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }
              }
              animate={{ opacity: 1, scale: 1 }}
              className="my-8 max-w-md mx-auto rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white/95 dark:bg-[#202C33]/95 backdrop-blur-md p-6 text-center shadow-md space-y-4"
            >
              <p className="text-sm font-medium text-[#111B21] dark:text-[#E9EDEF]">
                {endedNotice}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onNewMatch}
                  className="min-h-[42px] px-5 py-2 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{tr.chat.newMatchButton}</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnLobby}
                  className="min-h-[42px] px-4 py-2 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-sm font-medium text-[#111B21] dark:text-[#E9EDEF] hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] transition-colors whitespace-nowrap"
                >
                  Ana Sayfaya Dön
                </button>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Smooth Icebreakers Drawer */}
        <AnimatePresence>
          {showIcebreakers && match && !endedNotice && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="shrink-0 overflow-hidden border-t border-[#D1D7DB] dark:border-[#222E35] bg-[#F0F2F5] dark:bg-[#202C33]"
            >
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                    {tr.chat.icebreakersTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIcebreakers(false)}
                    className="text-xs text-[#54656F] dark:text-[#8696A0] hover:underline"
                  >
                    Kapat
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {tr.icebreakers.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        onSendMessage(prompt);
                        setShowIcebreakers(false);
                      }}
                      className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#2A3942] text-[#111B21] dark:text-[#E9EDEF] hover:border-[#00A884] transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smooth Emoji Picker */}
        <AnimatePresence>
          {showEmojis && match && !endedNotice && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden border-t border-[#D1D7DB] dark:border-[#222E35] bg-[#F0F2F5] dark:bg-[#202C33]"
            >
              <div className="px-4 py-2.5 flex flex-wrap gap-1">
                {EMOJI_LIST.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setInput((prev) => `${prev}${em}`)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-lg transition-colors"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Bottom Composer */}
        <div className="shrink-0 border-t border-[#D1D7DB] dark:border-[#222E35] bg-[#F0F2F5] dark:bg-[#202C33] px-2.5 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] space-y-1">
          {attachmentNotice && (
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium px-2">
              {attachmentNotice}
            </p>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={!match || Boolean(endedNotice)}
              onClick={() => {
                setShowEmojis((v) => !v);
                setShowIcebreakers(false);
              }}
              title={tr.chat.emojiTitle}
              aria-label={tr.chat.emojiTitle}
              className="min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-full text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 transition-colors shrink-0"
            >
              <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              disabled={!match || Boolean(endedNotice)}
              onClick={() => {
                setShowIcebreakers((v) => !v);
                setShowEmojis(false);
              }}
              title={tr.chat.icebreakersToggle}
              aria-label={tr.chat.icebreakersToggle}
              className="min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-full text-[#00A884] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 transition-colors shrink-0"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <input
              type="text"
              maxLength={1000}
              disabled={!match || Boolean(endedNotice)}
              value={input}
              onPaste={handlePasteOrDrop}
              onChange={(e) => {
                setInput(e.target.value);
                emitTyping(e.target.value.trim().length > 0);
              }}
              placeholder={tr.chat.inputPlaceholder}
              className="flex-1 min-w-0 min-h-[44px] rounded-full sm:rounded-xl bg-white dark:bg-[#2A3942] px-4 py-2 text-base sm:text-sm text-[#111B21] dark:text-[#E9EDEF] placeholder:text-[#667781] dark:placeholder:text-[#8696A0] focus:outline-none disabled:opacity-50 shadow-2xs"
            />

            <motion.button
              type="submit"
              disabled={!match || Boolean(endedNotice) || !input.trim()}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              aria-label={tr.chat.sendButton}
              className="w-11 h-11 rounded-full bg-[#00A884] hover:bg-[#008F6F] disabled:bg-[#B8C4C9] dark:disabled:bg-[#2A3942] text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-[#667781] dark:text-[#8696A0] px-2">
            <span>{tr.chat.textOnlyNotice}</span>
            <span className="font-mono tabular-nums">{input.length}/1000</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
