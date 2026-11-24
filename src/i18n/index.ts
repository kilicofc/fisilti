import { tr } from './tr';

export type LocaleKey = 'tr';

const locales = {
  tr,
} as const;

export function getTranslations(locale: LocaleKey = 'tr') {
  return locales[locale];
}

export { tr };
