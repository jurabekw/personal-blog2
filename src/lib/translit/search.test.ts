import { expect, test } from 'vitest';
import { normalizeForSearch } from './search';

test('normalizes all alphabets to current latin', () => {
  expect(normalizeForSearch('Маркетинг')).toBe('marketing');
  expect(normalizeForSearch('şahar Çoy')).toBe('shahar choy');
  expect(normalizeForSearch('ЎЗБЕК')).toBe("o'zbek");
  expect(normalizeForSearch('o‘zbek')).toBe("o'zbek");
  expect(normalizeForSearch('Ёз юлдуз эшик')).toBe('yoz yulduz eshik');
  expect(normalizeForSearch('ğalaba Öz')).toBe("g'alaba o'z");
});

test('cyrillic е is ye at word start, e elsewhere', () => {
  expect(normalizeForSearch('етти келажак')).toBe('yetti kelajak');
});

test('soft and hard signs', () => {
  expect(normalizeForSearch('сентябрь аъзо')).toBe("sentyabr a'zo");
});

test('ц is s after a consonant, ts after a vowel (Uzbek Latin spelling)', () => {
  expect(normalizeForSearch('акция')).toBe('aksiya');
  expect(normalizeForSearch('лицензия')).toBe('litsenziya');
});
