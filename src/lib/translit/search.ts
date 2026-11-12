const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ш: 'sh', ч: 'ch',
  ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h', э: 'e', ё: 'yo', ю: 'yu', я: 'ya', ъ: "'", ь: '', ы: 'i', щ: 'sh',
};
const NEW_TO_OLD: Record<string, string> = { ş: 'sh', ç: 'ch', ö: "o'", ğ: "g'" };
const CYR_VOWELS = 'аеёиоуўэюяы';

/**
 * Maps text in any of the three alphabets to lowercase current (1995) Latin, so that
 * "маркетинг", "Marketing" and "şahar"/"shahar" compare equal in site search.
 */
export function normalizeForSearch(text: string): string {
  const s = (text || '').toLowerCase().replace(/[‘’ʻʼ`]/g, "'");
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const prev = s[i - 1];
    if (c === 'е') {
      const atWordStart = i === 0 || !/[\p{L}']/u.test(prev);
      out += atWordStart || CYR_VOWELS.includes(prev) ? 'ye' : 'e';
    } else if (c === 'ц') {
      out += prev && CYR_VOWELS.includes(prev) ? 'ts' : 's';
    } else if (CYR_TO_LAT[c] !== undefined) {
      out += CYR_TO_LAT[c];
    } else if (NEW_TO_OLD[c] !== undefined) {
      out += NEW_TO_OLD[c];
    } else {
      out += c;
    }
  }
  return out;
}
