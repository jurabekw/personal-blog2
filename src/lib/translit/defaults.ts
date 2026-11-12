import type { TranslitConfig } from './types';

/**
 * Current-Latin stems whose Cyrillic spelling can't be derived by rules (soft sign, ъ, ц).
 * -tsiya / -tsion (investitsiya, prezentatsiya) are handled by the rules and need no entry.
 */
export const DEFAULT_EXCEPTIONS: Record<string, string> = {
  yanvar: 'январь',
  fevral: 'февраль',
  aprel: 'апрель',
  iyun: 'июнь',
  iyul: 'июль',
  sentabr: 'сентябрь',
  oktabr: 'октябрь',
  noyabr: 'ноябрь',
  dekabr: 'декабрь',
  aksiya: 'акция',
  kompyuter: 'компьютер',
  konsert: 'концерт',
  litsenziya: 'лицензия',
  funksiya: 'функция',
  stansiya: 'станция',
  konferensiya: 'конференция',
  sotsial: 'социал',
  obyekt: 'объект',
  subyekt: 'субъект',
  sikl: 'цикл',
  protsess: 'процесс',
  retsept: 'рецепт',
  ofitsial: 'официал',
  litsey: 'лицей',
  konsepsiya: 'концепция',
  reaksiya: 'реакция',
  tendensiya: 'тенденция',
};

/** Words that always stay in Latin, even on Cyrillic pages. */
export const DEFAULT_PROTECTED_WORDS: string[] = [
  'Google', 'Ads', 'Analytics', 'Search', 'Console', 'Meta', 'Facebook', 'Instagram', 'Telegram',
  'YouTube', 'TikTok', 'LinkedIn', 'ChatGPT', 'OpenAI', 'Claude', 'Anthropic', 'Gemini', 'Chrome',
  'Yandex', 'Metrika', 'Wordstat', 'Hamkorbank', 'WordPress', 'Elementor', 'Yoast', 'Vercel',
  'Next', 'React', 'Brandwatch', 'Ahrefs', 'Semrush', 'Figma', 'Notion', 'Excel',
  'SEO', 'GEO', 'AEO', 'SMM', 'CRO', 'UX', 'UI', 'CTR', 'CPC', 'CPA', 'CPM', 'ROI', 'ROAS', 'KPI',
  'CRM', 'CMS', 'API', 'AI', 'PR', 'HTML', 'URL', 'MBA', 'PDF', 'IT', 'SaaS', 'B2B', 'B2C', 'GA4',
  'FAQ', 'SERP', 'UTM', 'JSON', 'ID', 'IP', 'ERP', 'USP', 'OKR', 'IELTS', 'AMP', 'OTP', 'SEM', 'ROMI',
  'AOV', 'MAU', 'DAU', 'LTV', 'CAC', 'CPL', 'CTA', 'SLA', 'PNG', 'JPG', 'SVG', 'CSV', 'USD', 'UZS',
  'EEAT', 'PPC', 'SMS', 'QR', 'NDA', 'MVP', 'CEO', 'CMO', 'CTO', 'HR',
];

/** djb2 hash → short hex; good enough to tell dictionary versions apart in cache keys. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export function makeTranslitConfig(
  exceptions: Record<string, string>,
  protectedWords: string[],
): TranslitConfig {
  const normExceptions: Record<string, string> = {};
  for (const [k, v] of Object.entries(exceptions)) {
    const key = k.trim().toLowerCase().replace(/[‘’ʻʼ`]/g, "'");
    const val = v.trim().toLowerCase();
    if (key && val) normExceptions[key] = val;
  }
  const words = protectedWords.map((w) => w.trim()).filter(Boolean);
  return {
    exceptions: normExceptions,
    protectedWords: words,
    version: hash(JSON.stringify([normExceptions, words])),
  };
}

export const DEFAULT_TRANSLIT_CONFIG: TranslitConfig = makeTranslitConfig(
  DEFAULT_EXCEPTIONS,
  DEFAULT_PROTECTED_WORDS,
);
