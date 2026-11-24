import React from 'react';
import { X } from 'lucide-react';
import { tr } from '../i18n';

export type LegalDocType = 'terms' | 'privacy' | null;

export function LegalModal({
  docType,
  onClose,
}: {
  docType: LegalDocType;
  onClose: () => void;
}) {
  if (!docType) return null;

  const isTerms = docType === 'terms';
  const title = isTerms ? tr.legal.termsTitle : tr.legal.privacyTitle;
  const sections = isTerms ? tr.legal.termsSections : tr.legal.privacySections;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[#D1D7DB] dark:border-[#2A3942] bg-white dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#E9EDEF] dark:border-[#2A3942]">
          <h2 id="legal-modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#54656F] dark:text-[#8696A0] hover:bg-[#F0F2F5] dark:hover:bg-[#111B21] transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed text-[#54656F] dark:text-[#D1D7DB]">
          {sections.map((sec) => (
            <div key={sec.heading} className="space-y-1.5">
              <h3 className="font-semibold text-[#111B21] dark:text-[#E9EDEF]">
                {sec.heading}
              </h3>
              <p>{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[#E9EDEF] dark:border-[#2A3942] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-6 py-2 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
