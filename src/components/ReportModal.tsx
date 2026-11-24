import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { tr } from '../i18n';
import type { ReportReason } from '../types/chat';

const REASON_KEYS: ReportReason[] = [
  'harassment',
  'sexual',
  'underage',
  'scam',
  'hate_speech',
  'spam',
  'other',
];

export function ReportModal({
  open,
  roomId,
  sessionId,
  partnerAlias,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  roomId: string;
  sessionId: string;
  partnerAlias: string;
  onClose: () => void;
  onSubmitted: (confirmationText: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason === 'other' && description.trim().length < 5) {
      setError('Diğer seçeneği için en az 5 karakterlik kısa bir açıklama yazınız.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          sessionId,
          reason,
          description: description.trim().slice(0, 500),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Şikayet gönderilemedi.');
        return;
      }

      const msg = data.confirmationMessage || tr.report.successMessage;
      setSuccessMsg(msg);
      setTimeout(() => {
        setSuccessMsg(null);
        setDescription('');
        onSubmitted(msg);
      }, 1100);
    } catch {
      setError('Bağlantı hatası oluştu. Lütfen tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E9EDEF] dark:border-[#2A3942]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2 id="report-modal-title" className="text-lg font-semibold">
              {tr.report.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#54656F] dark:text-[#8696A0] hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#00A884] mx-auto" />
            <p className="text-base font-semibold text-[#111B21] dark:text-[#E9EDEF]">
              {successMsg}
            </p>
            <p className="text-sm text-[#54656F] dark:text-[#8696A0]">
              Sohbet güvenli şekilde kapatılıyor ve kimliğin gizli tutuluyor.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            <div className="text-xs text-[#54656F] dark:text-[#8696A0] space-y-1">
              <p>
                Bildirilen geçici ad:{' '}
                <span className="font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                  {partnerAlias}
                </span>
              </p>
              <p>{tr.report.subtitle}</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[#111B21] dark:text-[#E9EDEF] mb-2">
                {tr.report.reasonLabel}
              </legend>
              <div className="grid grid-cols-1 gap-2">
                {REASON_KEYS.map((key) => {
                  const selected = reason === key;
                  return (
                    <label
                      key={key}
                      className={`min-h-[42px] flex items-center gap-3 px-3.5 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                        selected
                          ? 'border-[#00A884] bg-[#E7FCE3]/70 dark:bg-[#005C4B]/40 text-[#111B21] dark:text-[#E9EDEF] font-medium'
                          : 'border-[#E9EDEF] dark:border-[#2A3942] hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] text-[#111B21] dark:text-[#D1D7DB]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={key}
                        checked={selected}
                        onChange={() => setReason(key)}
                        className="accent-[#00A884] w-4 h-4 shrink-0"
                      />
                      <span>{tr.report.reasons[key]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label
                  htmlFor="report-description"
                  className="font-medium text-[#111B21] dark:text-[#E9EDEF]"
                >
                  {tr.report.descriptionLabel}
                </label>
                <span className="font-mono tabular-nums text-[#54656F] dark:text-[#8696A0]">
                  {description.length}/500
                </span>
              </div>
              <textarea
                id="report-description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tr.report.descriptionPlaceholder}
                className="w-full rounded-xl border border-[#D1D7DB] dark:border-[#2A3942] bg-[#F0F2F5] dark:bg-[#111B21] px-3.5 py-2.5 text-base sm:text-sm text-[#111B21] dark:text-[#E9EDEF] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#00A884]"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-5 py-2 rounded-full border border-[#D1D7DB] dark:border-[#2A3942] text-sm font-medium text-[#111B21] dark:text-[#E9EDEF] hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] transition-colors whitespace-nowrap shrink-0"
              >
                {tr.chat.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[42px] px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                {submitting ? tr.report.submitting : tr.report.submitButton}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
