import crypto from 'node:crypto';

const ADJECTIVES = [
  'Sessiz',
  'Sakin',
  'Zümrüt',
  'Kuzey',
  'Gece',
  'Mavi',
  'Duru',
  'Derin',
  'Uzak',
  'Gümüş',
  'Sabah',
  'Yalın',
  'Serin',
  'Berrak',
];

const NOUNS = [
  'Orman',
  'Rüzgar',
  'Yolcu',
  'Fener',
  'Deniz',
  'Nehir',
  'Bulut',
  'Gölge',
  'Yıldız',
  'Kıyı',
  'Vadi',
  'Ada',
  'Liman',
  'Ufuk',
];

const UNDERAGE_PATTERNS: RegExp[] = [
  /\breşit\s*değilim\b/i,
  /\b18\s*(yaşından|yaştan)?\s*küçüğüm\b/i,
  /\b(1[0-7]|[6-9])\s*yaşındayım\b/i,
  /\byaşım\s*(1[0-7]|[6-9])\b/i,
  /\bortaokul(a|da|dan)?\s*(gidiyorum|okuyorum)?\b/i,
  /\blise\s*[123]('e|'te|e|te)?\s*(gidiyorum|okuyorum)\b/i,
  /\b20(09|1[0-9])\s*doğumluyum\b/i,
];

const SEVERE_BLOCK_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  {
    pattern: /\b(seni\s*öldür|gebertirim|adresini\s*bulup|canına\s*okurum|intihar\s*et)\b/i,
    category: 'Tehdit veya kendine zarar verme içeriği',
  },
  {
    pattern: /\b(çocuk\s*porno|pedofil|küçük\s*kız|küçük\s*erkek\s*foto)\b/i,
    category: 'İstismar şüphesi içeren ifade',
  },
  {
    pattern: /\b(nude\s*at|çıplak\s*foto|sex\s*yapalım|seks\s*yapalım|yatak\s*istiyorum|memeni\s*at)\b/i,
    category: 'Cinsel içerik veya istek',
  },
];

const PROFANITY_WORDS: string[] = [
  'amk',
  'aq',
  'orospu',
  'piç',
  'siktir',
  'sikim',
  'yarrak',
  'göt',
  'kahpe',
  'pezevenk',
  'ibne',
  'şerefsiz',
  'gerizekalı',
  'aptal',
  'salak',
  'fuck',
  'bitch',
  'asshole',
];

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string; flag: string }> = [
  {
    pattern: /(?:\+?90[\s.-]?)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    replacement: '[TELEFON GİZLENDİ]',
    flag: 'telefon',
  },
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[E-POSTA GİZLENDİ]',
    flag: 'eposta',
  },
  {
    pattern: /\bTR\d{2}(?:[\s-]?\d{4}){5}[\s-]?\d{2}\b/gi,
    replacement: '[IBAN GİZLENDİ]',
    flag: 'iban',
  },
  {
    pattern: /(?:https?:\/\/|www\.)\S+/gi,
    replacement: '[BAĞLANTI GİZLENDİ]',
    flag: 'baglanti',
  },
  {
    pattern: /(?:^|\s)@[a-zA-Z0-9._]{2,30}/g,
    replacement: ' [SOSYAL HESAP GİZLENDİ]',
    flag: 'sosyal_medya',
  },
  {
    pattern: /\b(?:instagram|insta|ig|snapchat|snap|telegram|whatsapp|wp|discord|tiktok)\s*[:=\-]?\s*[a-zA-Z0-9._]{3,}/gi,
    replacement: '[SOSYAL HESAP GİZLENDİ]',
    flag: 'sosyal_medya',
  },
  {
    pattern: /\b\d{11}\b/g,
    replacement: '[KİMLİK/NUMARA GİZLENDİ]',
    flag: 'kimlik_no',
  },
  {
    pattern: /\b[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}\s+(?:mahallesi|mah\.|caddesi|cad\.|sokağı|sokak|sok\.)\s+.*?(?:no\s*[:.]?\s*\d+|daire\s*[:.]?\s*\d+)/gi,
    replacement: '[ADRES GİZLENDİ]',
    flag: 'adres',
  },
];

export function generateAnonymousAlias(): string {
  const adj = ADJECTIVES[crypto.randomInt(0, ADJECTIVES.length)];
  const noun = NOUNS[crypto.randomInt(0, NOUNS.length)];
  const num = crypto.randomInt(10, 99);
  return `${adj} ${noun} #${num}`;
}

export function generateAvatarSeed(): string {
  return crypto.randomBytes(6).toString('hex');
}

export function sanitizeNickname(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (cleaned.length < 2) return null;

  for (const pii of PII_PATTERNS) {
    if (pii.pattern.test(cleaned)) {
      pii.pattern.lastIndex = 0;
      return null;
    }
    pii.pattern.lastIndex = 0;
  }

  const lower = cleaned.toLocaleLowerCase('tr-TR');
  for (const word of PROFANITY_WORDS) {
    if (lower.includes(word)) {
      return null;
    }
  }

  return cleaned;
}

export interface SafetyEvaluation {
  allowed: boolean;
  underageDetected: boolean;
  sanitizedText: string;
  blockReason?: string;
  maskedFlags: string[];
  urgentFlag: boolean;
}

export function evaluateMessageSafety(rawText: string): SafetyEvaluation {
  const trimmed = rawText.trim();
  const maskedFlags: string[] = [];

  for (const rx of UNDERAGE_PATTERNS) {
    if (rx.test(trimmed)) {
      return {
        allowed: false,
        underageDetected: true,
        sanitizedText: '',
        blockReason:
          '18 yaş altı kullanım tespit edildi. Platform yalnızca 18 yaş ve üzeri kullanıcılar içindir; oturumunuz sonlandırıldı.',
        maskedFlags: ['underage'],
        urgentFlag: true,
      };
    }
  }

  for (const rule of SEVERE_BLOCK_PATTERNS) {
    if (rule.pattern.test(trimmed)) {
      return {
        allowed: false,
        underageDetected: false,
        sanitizedText: '',
        blockReason: `Mesajınız güvenlik politikası nedeniyle engellendi (${rule.category}).`,
        maskedFlags: ['severe_content'],
        urgentFlag: true,
      };
    }
  }

  let sanitized = trimmed;

  for (const pii of PII_PATTERNS) {
    pii.pattern.lastIndex = 0;
    if (pii.pattern.test(sanitized)) {
      pii.pattern.lastIndex = 0;
      sanitized = sanitized.replace(pii.pattern, pii.replacement);
      if (!maskedFlags.includes(pii.flag)) {
        maskedFlags.push(pii.flag);
      }
    }
  }

  for (const word of PROFANITY_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`\\b${escaped}\\b`, 'gi');
    if (rx.test(sanitized)) {
      sanitized = sanitized.replace(rx, '***');
      if (!maskedFlags.includes('kufur')) {
        maskedFlags.push('kufur');
      }
    }
  }

  return {
    allowed: true,
    underageDetected: false,
    sanitizedText: sanitized,
    maskedFlags,
    urgentFlag: false,
  };
}

export function isUrgentReportContent(
  reason: string,
  description: string,
  transcriptTexts: string[],
): boolean {
  if (reason === 'underage') return true;
  const combined = `${description} ${transcriptTexts.join(' ')}`;
  if (
    /\b(öldür|tehdit|intihar|istismar|reşit değil|1[0-7]\s*yaş|tecavüz|şantaj)\b/i.test(
      combined,
    )
  ) {
    return true;
  }
  return false;
}
